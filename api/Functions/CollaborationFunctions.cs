using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using OnlyFling.Api.Core;

namespace OnlyFling.Api.Functions;

public sealed class CollaborationFunctions(AppRepository repository, AuthService authService, HttpResponseFactory responses)
{
    [Function("CollaborationProfile")]
    public async Task<HttpResponseData> CollaborationProfile([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "collaboration/profile")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        if (request.Method == "GET") return await responses.JsonAsync(request, new { profile = await repository.GetCollaborationProfileAsync(session.UserId) });
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<CollaborationProfileInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var profile = await repository.SaveCollaborationProfileAsync(session.UserId, payload!);
        await repository.AppendAuditEventAsync(session.UserId, "collaboration.profile.saved", "collaboration-profile", session.UserId, $"Saved collaboration profile for {profile.City}.");
        return await responses.JsonAsync(request, new { profile }, HttpStatusCode.Created);
    }

    [Function("CollaborationNearby")]
    public async Task<HttpResponseData> CollaborationNearby([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "collaboration/nearby")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var maxKm = int.TryParse(HttpResponseFactory.GetQuery(request, "maxKm"), out var parsed) ? parsed : 75;
        return await responses.JsonAsync(request, new { nearby = await repository.FindNearbyMembersAsync(session.UserId, maxKm) });
    }

    [Function("CollaborationRequest")]
    public async Task<HttpResponseData> CollaborationRequest([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "collaboration/request")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<CollaborationRequestInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var item = await repository.CreateCollaborationRequestAsync(session.UserId, payload!.TargetUserId, payload.CollaborationType, payload.Note);
        await repository.AppendAuditEventAsync(session.UserId, "collaboration.request.created", "collaboration-request", item.Id, $"Requested {item.CollaborationType} collaboration from {item.ToUserId}.");
        return await responses.JsonAsync(request, new { request = item }, HttpStatusCode.Created);
    }

    [Function("CollaborationRespond")]
    public async Task<HttpResponseData> CollaborationRespond([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "collaboration/respond")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<CollaborationResponseInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var responseModel = await repository.RespondToCollaborationRequestAsync(payload!.RequestId, session.UserId, payload.Accept);
        if (responseModel is null) return await responses.ErrorAsync(request, "not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "collaboration.request.responded", "collaboration-request", responseModel.Id, $"Marked collaboration request as {responseModel.Status}.");
        return await responses.JsonAsync(request, new { request = responseModel });
    }

    [Function("CollaborationAlerts")]
    public async Task<HttpResponseData> CollaborationAlerts([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "collaboration/alerts")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var alerts = await repository.RefreshAlertsForUserAsync(session.UserId);
        return await responses.JsonAsync(request, new { alerts = alerts.Count > 0 ? alerts : await repository.ListAlertsAsync(session.UserId), requests = await repository.ListCollaborationRequestsAsync(session.UserId) });
    }

    [Function("PlatformRequests")]
    public async Task<HttpResponseData> PlatformRequests([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "platform-requests")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        if (request.Method == "GET") return await responses.JsonAsync(request, new { requests = await repository.ListPlatformRequestsAsync() });
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<PlatformRequestInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        var created = await repository.CreatePlatformRequestAsync(session.UserId, user.DisplayName, payload!.PlatformName, payload.Type, payload.Note);
        await repository.AppendAuditEventAsync(session.UserId, "platform.request.created", "platform-request", created.Id, $"Requested {created.PlatformName}.");
        return await responses.JsonAsync(request, new { request = created }, HttpStatusCode.Created);
    }

    [Function("AffiliateLaunch")]
    public async Task<HttpResponseData> AffiliateLaunch([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "affiliate/launch")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        if (request.Method == "GET")
        {
            var campaign = await repository.GetAffiliateCampaignAsync(session.UserId) ?? await repository.SaveAffiliateCampaignAsync(session.UserId, user.DisplayName, new AffiliateCampaignInput { CtaCopy = "Start earning with me", RewardPercent = 10, CapSalesCount = 5, CapDays = 21 });
            return await responses.JsonAsync(request, new { campaign, landingUrl = $"https://onlyfling.local/invite/{campaign.ShareCode}", rewardRule = $"Affiliate reward applies for the first {campaign.CapSalesCount} sales or {campaign.CapDays} days, whichever comes first." });
        }
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AffiliateCampaignInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var saved = await repository.SaveAffiliateCampaignAsync(session.UserId, user.DisplayName, payload!);
        await repository.AppendAuditEventAsync(session.UserId, "affiliate.campaign.saved", "affiliate-campaign", saved.Id, "Updated affiliate launch settings.");
        return await responses.JsonAsync(request, new { campaign = saved });
    }

    [Function("MemberRequests")]
    public async Task<HttpResponseData> MemberRequests([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "member-requests")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var currentUser = await repository.GetOrCreateUserAsync(session.Email);
        if (request.Method == "GET")
        {
            var requests = await repository.ListMemberRequestsAsync(session.UserId);
            return await responses.JsonAsync(request, new { requests, summary = new { open = requests.Count(entry => entry.Status == "open"), promised = requests.Count(entry => entry.Status == "accepted"), fulfilled = requests.Count(entry => entry.Status == "fulfilled") } });
        }
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MemberRequestInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var targetUser = (await repository.ListUsersAsync()).FirstOrDefault(entry => entry.Id == payload!.TargetUserId);
        if (targetUser is null) return await responses.ErrorAsync(request, "target-not-found", HttpStatusCode.NotFound);
        var memberPayload = payload!;
        var created = await repository.CreateMemberRequestAsync(session.UserId, currentUser.DisplayName, memberPayload.TargetUserId, targetUser.DisplayName, memberPayload.Title, memberPayload.Details, memberPayload.Type);
        await repository.AppendAuditEventAsync(session.UserId, "member.request.created", "member-request", created.Id, $"Created request '{created.Title}'.");
        return await responses.JsonAsync(request, new { request = created }, HttpStatusCode.Created);
    }

    [Function("MemberRequestAction")]
    public async Task<HttpResponseData> MemberRequestAction([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "member-requests/action")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MemberRequestActionInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var updated = await repository.ActOnMemberRequestAsync(payload!.RequestId, session.UserId, payload.Action);
        if (updated is null) return await responses.ErrorAsync(request, "not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "member.request.updated", "member-request", updated.Id, $"Marked request '{updated.Title}' as {updated.Status}.");
        return await responses.JsonAsync(request, new { request = updated });
    }

    [Function("StudioSessions")]
    public async Task<HttpResponseData> StudioSessions([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "studio/sessions")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var currentUser = await repository.GetOrCreateUserAsync(session.Email);
        if (request.Method == "GET")
        {
            var sessions = await repository.ListStudioSessionsAsync(session.UserId);
            var selectedSessionId = HttpResponseFactory.GetQuery(request, "sessionId");
            var timeline = string.IsNullOrWhiteSpace(selectedSessionId) ? new List<StudioTimelineEntry>() : await repository.ListStudioTimelineAsync(selectedSessionId);
            return await responses.JsonAsync(request, new { sessions, timeline });
        }
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<StudioSessionInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var studioPayload = payload!;
        var partner = (await repository.ListUsersAsync()).FirstOrDefault(entry => entry.Id == studioPayload.PartnerUserId);
        if (partner is null) return await responses.ErrorAsync(request, "partner-not-found", HttpStatusCode.NotFound);
        var created = await repository.CreateStudioSessionAsync(session.UserId, currentUser.DisplayName, studioPayload.PartnerUserId, partner.DisplayName, studioPayload);
        await repository.AppendAuditEventAsync(session.UserId, "studio.session.created", "studio-session", created.Id, $"Created studio session '{created.Title}'.");
        return await responses.JsonAsync(request, new { session = created }, HttpStatusCode.Created);
    }

    [Function("StudioSessionAction")]
    public async Task<HttpResponseData> StudioSessionAction([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "studio/sessions/action")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<StudioSessionActionInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var currentUser = await repository.GetOrCreateUserAsync(session.Email);
        var updated = await repository.ActOnStudioSessionAsync(payload!.SessionId, session.UserId, currentUser.DisplayName, payload.Action);
        if (updated is null) return await responses.ErrorAsync(request, "not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "studio.session.updated", "studio-session", updated.Id, $"Applied studio action {payload.Action} to '{updated.Title}'.");
        return await responses.JsonAsync(request, new { session = updated, timeline = await repository.ListStudioTimelineAsync(updated.Id) });
    }
}
