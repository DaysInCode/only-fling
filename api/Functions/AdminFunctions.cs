using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using OnlyFling.Api.Core;

namespace OnlyFling.Api.Functions;

public sealed class AdminFunctions(AppRepository repository, AuthService authService, HttpResponseFactory responses)
{
    [Function("AdminRoutes")]
    public async Task<HttpResponseData> AdminRoutes([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "{segment:regex(^admin$)}/{*path}")] HttpRequestData request, string segment, string? path)
    {
        if (HttpResponseFactory.IsOptions(request))
        {
            return path?.StartsWith("admin/", StringComparison.OrdinalIgnoreCase) == true ? responses.CreateOptions(request) : await responses.ErrorAsync(request, "not-found", HttpStatusCode.NotFound);
        }

        var normalizedPath = $"{segment}/{(path ?? string.Empty).Trim('/')}".TrimEnd('/');

        var session = await authService.GetBearerSessionAsync(request);
        if (session?.Role != "platformAdmin")
        {
            return await responses.ErrorAsync(request, "forbidden", HttpStatusCode.Forbidden);
        }

        return normalizedPath switch
        {
            "admin/audit-log" => await responses.JsonAsync(request, new { events = (await repository.ListAuditEventsAsync()).Take(25) }),
            "admin/users" => await responses.JsonAsync(request, new { users = await repository.ListUsersAsync() }),
            "admin/subscriptions" => await responses.JsonAsync(request, new { subscriptions = await repository.ListSubscriptionsAsync() }),
            "admin/reports/earnings" => await responses.JsonAsync(request, new { report = await repository.GetEarningsReportAsync() }),
            "admin/reports/storage" => await responses.JsonAsync(request, new { report = await repository.GetStorageUsageReportAsync() }),
            "admin/collaboration" => await BuildCollaborationResponse(request),
            "admin/platform-requests" => await responses.JsonAsync(request, new { requests = await repository.ListPlatformRequestsAsync() }),
            "admin/studio" => await responses.JsonAsync(request, new { sessions = await repository.ListAllStudioSessionsAsync() }),
            "admin/plugins" => await responses.JsonAsync(request, new { plugins = await repository.ListPluginsAsync() }),
            "admin/plugins/config" => request.Method == "POST" ? await UpdatePluginConfigAsync(request, session.UserId) : await responses.ErrorAsync(request, "method-not-allowed", HttpStatusCode.MethodNotAllowed),
            "admin/publishing/review" => request.Method == "POST" ? await ReviewPublishingAsync(request, session.UserId) : await responses.ErrorAsync(request, "method-not-allowed", HttpStatusCode.MethodNotAllowed),
            "admin/seeding/import" => request.Method == "POST" ? await ImportSeedAsync(request, session.UserId) : await responses.ErrorAsync(request, "method-not-allowed", HttpStatusCode.MethodNotAllowed),
            "admin/seeding/history" => await responses.JsonAsync(request, new { operations = await repository.ListSeedImportsAsync() }),
            "admin/monitoring/summary" => await responses.JsonAsync(request, new { summary = await repository.GetMonitoringSummaryAsync() }),
            "admin/monitoring/events" => await responses.JsonAsync(request, new { events = await repository.ListMonitoringEventsAsync() }),
            _ => await responses.ErrorAsync(request, "not-found", HttpStatusCode.NotFound),
        };
    }

    private async Task<HttpResponseData> BuildCollaborationResponse(HttpRequestData request)
    {
        var users = await repository.ListUsersAsync();
        var requests = new Dictionary<string, CollaborationRequest>();
        foreach (var user in users)
        {
            foreach (var item in await repository.ListCollaborationRequestsAsync(user.Id))
            {
                requests[item.Id] = item;
            }
        }

        return await responses.JsonAsync(request, new { profiles = await repository.ListAllCollaborationProfilesAsync(), requests = requests.Values });
    }

    private async Task<HttpResponseData> UpdatePluginConfigAsync(HttpRequestData request, string actorUserId)
    {
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AdminPluginConfigInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var updated = await repository.UpdatePluginConfigAsync(actorUserId, payload!);
        return updated is null
            ? await responses.ErrorAsync(request, "plugin-not-found", HttpStatusCode.NotFound)
            : await responses.JsonAsync(request, new { plugin = updated });
    }

    private async Task<HttpResponseData> ImportSeedAsync(HttpRequestData request, string actorUserId)
    {
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AdminSeedImportInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        try
        {
            var operation = await repository.ImportSeedAsync(actorUserId, payload!);
            return await responses.JsonAsync(request, new { operation }, HttpStatusCode.Created);
        }
        catch (InvalidOperationException ex) when (ex.Message == "seed-path-outside-root")
        {
            return await responses.ErrorAsync(request, "seed-path-outside-root", HttpStatusCode.BadRequest);
        }
        catch (IOException)
        {
            return await responses.ErrorAsync(request, "seed-path-unreadable", HttpStatusCode.BadRequest);
        }
        catch (UnauthorizedAccessException)
        {
            return await responses.ErrorAsync(request, "seed-path-unreadable", HttpStatusCode.BadRequest);
        }
        catch (System.Text.Json.JsonException)
        {
            return await responses.ErrorAsync(request, "invalid-seed-manifest", HttpStatusCode.BadRequest);
        }
    }

    private async Task<HttpResponseData> ReviewPublishingAsync(HttpRequestData request, string actorUserId)
    {
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AdminCollectionPublishReviewInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var reviewed = await repository.ReviewCollectionPublishAsync(actorUserId, payload!);
        if (reviewed.Collection is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
        return await responses.JsonAsync(request, new { collection = reviewed.Collection, logs = reviewed.Logs });
    }
}
