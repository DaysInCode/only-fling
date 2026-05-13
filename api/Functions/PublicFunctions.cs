using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using OnlyFling.Api.Core;

namespace OnlyFling.Api.Functions;

public sealed class PublicFunctions(AppConfiguration configuration, AppRepository repository, AuthService authService, UploadService uploadService, ModuleCatalogService moduleCatalog, HttpResponseFactory responses)
{
    [Function("Health")]
    public Task<HttpResponseData> Health([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "health")] HttpRequestData request)
        => HttpResponseFactory.IsOptions(request)
            ? Task.FromResult(responses.CreateOptions(request))
            : responses.JsonAsync(request, new
            {
                status = "ok",
                timestamp = DateTimeOffset.UtcNow.ToString("O"),
                platformFeePercent = configuration.PlatformFeePercent,
                platformTransactionCut = configuration.PlatformTransactionCutRate,
                storageConfigured = configuration.StorageEnabled,
                deploymentRing = configuration.DeploymentRing,
                stripe = new { configured = configuration.StripeConfigured, valid = configuration.Stripe.IsValid, errors = configuration.Stripe.ValidationErrors },
                previewEnrollment = true
            });

    [Function("Connectors")]
    public async Task<HttpResponseData> Connectors([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "connectors")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        return await responses.JsonAsync(request, await moduleCatalog.GetConnectorCatalogAsync(session));
    }

    [Function("ConnectorsModules")]
    public async Task<HttpResponseData> ConnectorModules([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "connectors/modules")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        var catalog = await moduleCatalog.GetConnectorCatalogAsync(session);
        return await responses.JsonAsync(request, catalog);
    }

    [Function("ActivePlugins")]
    public async Task<HttpResponseData> ActivePlugins([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "plugins/active")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        return await responses.JsonAsync(request, new { plugins = await repository.ListClientVisiblePluginsAsync(session) });
    }

    [Function("ConnectorsPreviewEnroll")]
    public async Task<HttpResponseData> PreviewEnroll([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "connectors/preview/enroll")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<PreviewEnrollmentInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var result = await moduleCatalog.EnrollAsync(session, payload!.ModuleId);
        if (result.Error is not null)
        {
            return await responses.ErrorAsync(request, result.Error, result.Error == "module-not-found" ? HttpStatusCode.NotFound : HttpStatusCode.Conflict);
        }
        return await responses.JsonAsync(request, new { enrollment = result.Enrollment }, HttpStatusCode.Created);
    }

    [Function("AuthRequestLink")]
    public async Task<HttpResponseData> RequestLink([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "auth/request-link")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AuthRequestInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var challenge = await repository.CreateChallengeAsync(payload!.Email);
        var user = await repository.GetOrCreateUserAsync(payload.Email);
        await repository.AppendAuditEventAsync(user.Id, "auth.challenge.created", "user", user.Id, "Created passwordless sign-in challenge.");
        var exposeDevelopmentCode = configuration.IsLocalDevelopment || configuration.DevModeExposeAuthCodes || IsRemoteBddAuthRequest(request);
        return await responses.JsonAsync(request, new AuthRequestResponse { Message = "Challenge created.", DevelopmentCode = exposeDevelopmentCode ? challenge.Code : null });
    }

    [Function("AuthVerify")]
    public async Task<HttpResponseData> VerifyLink([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "auth/verify")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AuthVerifyInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var challenge = await repository.VerifyChallengeAsync(payload!.Email, payload.Code);
        if (challenge is null) return await responses.ErrorAsync(request, "invalid-or-expired-code", HttpStatusCode.Unauthorized);
        var user = await repository.GetOrCreateUserAsync(payload.Email);
        var session = await repository.CreateSessionAsync(user, payload.DeviceName, HttpResponseFactory.GetHeader(request, "user-agent"), HttpResponseFactory.GetHeader(request, "x-forwarded-for").Split(',').FirstOrDefault()?.Trim());
        await repository.AppendAuditEventAsync(user.Id, "auth.session.created", "session", session.Id, "Issued API session token.");
        return await responses.JsonAsync(request, new AuthVerifyResponse { Token = session.Token, User = user });
    }

    private bool IsRemoteBddAuthRequest(HttpRequestData request)
        => configuration.BddRemoteAuthConfigured &&
           string.Equals(HttpResponseFactory.GetHeader(request, "x-bdd-remote-auth"), configuration.BddRemoteAuthToken, StringComparison.Ordinal);

    [Function("Me")]
    public async Task<HttpResponseData> Me([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "me")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new MeResponse { User = new SessionUser { Email = session.Email, Role = session.Role, UserId = session.UserId, SessionId = session.Id } });
    }

    [Function("OnboardingComplete")]
    public async Task<HttpResponseData> CompleteOnboarding([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "onboarding/complete")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<OnboardingInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var onboarding = await repository.SaveOnboardingAsync(session.UserId, payload!);
        await repository.AppendAuditEventAsync(session.UserId, "onboarding.completed", "workspace", onboarding.Id, $"Completed onboarding for {onboarding.WorkspaceName}.");
        return await responses.JsonAsync(request, new { onboarding }, HttpStatusCode.Created);
    }

    [Function("Items")]
    public async Task<HttpResponseData> Items([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "items")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        if (request.Method == "GET")
        {
            var items = await repository.ListItemsAsync();
            return await responses.JsonAsync(request, new { items, commission = new { platformFeePercent = configuration.PlatformFeePercent, transactionCut = configuration.PlatformTransactionCutRate } });
        }
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<ItemInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var item = await repository.CreateItemAsync(session.UserId, payload!);
        await repository.AppendAuditEventAsync(session.UserId, "item.created", "item", item.Id, $"Created catalog item {item.Title}.");
        return await responses.JsonAsync(request, new { item }, HttpStatusCode.Created);
    }

    [Function("UploadsPresign")]
    public async Task<HttpResponseData> PresignUpload([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "uploads/presign")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<UploadInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var upload = await uploadService.CreateUploadUrlAsync(payload!.FileName, payload.ContentType);
        return await responses.JsonAsync(request, new { upload });
    }

    [Function("DashboardSummary")]
    public async Task<HttpResponseData> DashboardSummary([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "dashboard/summary")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new { summary = await repository.GetDashboardSummaryAsync() });
    }

    [Function("ModerationQueue")]
    public async Task<HttpResponseData> ModerationQueue([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "moderation/queue")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null || session.Role is not ("platformAdmin" or "moderator")) return await responses.ErrorAsync(request, "forbidden", HttpStatusCode.Forbidden);
        return await responses.JsonAsync(request, new { cases = await repository.ListModerationCasesAsync() });
    }

    [Function("QualificationRules")]
    public async Task<HttpResponseData> Qualification([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "qualification/rules")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new { rules = await repository.QualificationRulesAsync(), outcomeStates = new[] { "accepted", "needs-review", "rejected" } });
    }

    [Function("CrmLeads")]
    public async Task<HttpResponseData> CrmLeads([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "crm/leads")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null || session.Role is not ("platformAdmin" or "moderator")) return await responses.ErrorAsync(request, "forbidden", HttpStatusCode.Forbidden);
        return await responses.JsonAsync(request, new { leads = await repository.ListLeadsAsync(), note = "This CRM starter is limited to opt-in, referral, import, and manual-research leads. It intentionally excludes scraping workflows." });
    }

    [Function("DevUploads")]
    public async Task<HttpResponseData> DevUploads([HttpTrigger(AuthorizationLevel.Anonymous, "put", "options", Route = "dev-uploads/{*blobPath}")] HttpRequestData request, string blobPath)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        await uploadService.SaveDevelopmentUploadAsync(blobPath, request.Body);
        var response = request.CreateResponse(HttpStatusCode.Created);
        HttpResponseFactory.AddCors(response);
        return response;
    }
}
