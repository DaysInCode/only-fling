using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using OnlyFling.Api.Core;

namespace OnlyFling.Api.Functions;

public sealed class AccountFunctions(AppRepository repository, AuthService authService, HttpResponseFactory responses)
{
    [Function("AccountProfile")]
    public async Task<HttpResponseData> AccountProfile([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "account/profile")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        if (request.Method == "GET") return await responses.JsonAsync(request, new { profile = await repository.GetOrCreateAccountProfileAsync(user) });
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AccountProfileInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var profile = await repository.UpdateAccountProfileAsync(user, payload!);
        if (!string.Equals(profile.DisplayName, user.DisplayName, StringComparison.Ordinal)) await repository.UpdateUserDisplayNameAsync(user.Id, user.Email, profile.DisplayName);
        await repository.AppendAuditEventAsync(session.UserId, "account.profile.updated", "account-profile", session.UserId, "Updated account profile settings.");
        return await responses.JsonAsync(request, new { profile });
    }

    [Function("AccountSettings")]
    public async Task<HttpResponseData> AccountSettings([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "account/settings")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var sessions = await repository.ListUserSessionsAsync(session.UserId);
        if (request.Method == "GET") return await responses.JsonAsync(request, new { settings = await repository.GetOrCreateAccountSettingsAsync(session.UserId, sessions.Count) });
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<AccountSettingsInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        if (!string.IsNullOrWhiteSpace(payload!.DeviceSync.LastSyncedSessionId) && sessions.All(entry => entry.Id != payload.DeviceSync.LastSyncedSessionId)) return await responses.ErrorAsync(request, "unknown-session-reference", HttpStatusCode.BadRequest);
        var settings = await repository.UpdateAccountSettingsAsync(session.UserId, payload, sessions.Count);
        await repository.AppendAuditEventAsync(session.UserId, "account.settings.updated", "account-settings", session.UserId, "Updated account settings.");
        return await responses.JsonAsync(request, new { settings });
    }

    [Function("AccountSessions")]
    public async Task<HttpResponseData> AccountSessions([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "account/sessions")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var sessions = await repository.ListUserSessionsAsync(session.UserId);
        var settings = await repository.GetOrCreateAccountSettingsAsync(session.UserId, sessions.Count);
        return await responses.JsonAsync(request, new { sessions = sessions.Select(entry => repository.ToAccountSessionView(entry, session.Id)), deviceSync = settings.DeviceSync });
    }

    [Function("AccountSessionsRevoke")]
    public async Task<HttpResponseData> AccountSessionsRevoke([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "account/sessions/revoke")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<RevokeSessionInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var revoked = await repository.RevokeUserSessionAsync(session.UserId, payload!.SessionId);
        if (revoked is null) return await responses.ErrorAsync(request, "session-not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "account.session.revoked", "session", revoked.Id, "Revoked an active session.");
        return await responses.JsonAsync(request, new { session = repository.ToAccountSessionView(revoked, session.Id) });
    }

    [Function("AccountClose")]
    public async Task<HttpResponseData> AccountClose([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "account/close")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<CloseAccountInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        if (payload!.Action is not ("request" or "close")) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, new Dictionary<string, string[]> { ["action"] = ["Action must be request or close."] });
        if (!payload.ConfirmRetentionAcknowledged || !payload.ConfirmAccessLossAcknowledged) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        var profile = await repository.GetOrCreateAccountProfileAsync(user);
        if (!string.Equals(payload.ConfirmEmail, user.Email, StringComparison.OrdinalIgnoreCase) || !string.Equals(payload.ConfirmDisplayName, profile.DisplayName, StringComparison.Ordinal)) return await responses.ErrorAsync(request, "confirmation-mismatch", HttpStatusCode.BadRequest);
        var settings = await repository.GetOrCreateAccountSettingsAsync(user.Id);
        if (payload.Action == "close" && settings.CloseAccount.Status != "requested") return await responses.ErrorAsync(request, "closure-must-be-requested-first", HttpStatusCode.Conflict);
        var updated = await repository.RequestCloseAccountAsync(user, session.Id, payload.Reason.Trim(), payload.Action);
        await repository.AppendAuditEventAsync(session.UserId, payload.Action == "request" ? "account.closure.requested" : "account.closed", "account", session.UserId, payload.Action == "request" ? "Requested account closure." : "Account marked closed without deleting audit history.");
        return await responses.JsonAsync(request, new { closeAccount = updated.CloseAccount });
    }

    [Function("AccountAudit")]
    public async Task<HttpResponseData> AccountAudit([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "account/audit")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var limit = int.TryParse(HttpResponseFactory.GetQuery(request, "limit"), out var parsed) ? Math.Clamp(parsed, 1, 100) : 50;
        return await responses.JsonAsync(request, new { events = (await repository.ListAuditEventsForAccountAsync(session.UserId)).Take(limit) });
    }

    [Function("VerificationReadiness")]
    public async Task<HttpResponseData> VerificationReadiness([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "account/verification-readiness")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        return await responses.JsonAsync(request, new { readiness = await repository.GetVerificationReadinessAsync(user) });
    }

    [Function("MediaCollections")]
    public async Task<HttpResponseData> MediaCollections([HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", "options", Route = "media/collections")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        if (request.Method == "GET") return await responses.JsonAsync(request, new { collections = await repository.ListMediaCollectionsAsync(session.UserId) });
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaCollectionInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var collection = await repository.CreateMediaCollectionAsync(session.UserId, payload!);
        await repository.AppendAuditEventAsync(session.UserId, "media.collection.created", "media-collection", collection!.Id, $"Created collection '{collection.Title}'.");
        return await responses.JsonAsync(request, new { collection }, HttpStatusCode.Created);
    }

    [Function("MediaCollectionUpdate")]
    public async Task<HttpResponseData> MediaCollectionUpdate([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/collections/update")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaCollectionUpdateInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var collection = await repository.UpdateMediaCollectionAsync(session.UserId, payload!);
        if (collection is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "media.collection.updated", "media-collection", collection.Id, $"Updated collection '{collection.Title}'.");
        return await responses.JsonAsync(request, new { collection });
    }

    [Function("MediaCollectionDelete")]
    public async Task<HttpResponseData> MediaCollectionDelete([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/collections/delete")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaCollectionDeleteInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var collection = await repository.SoftDeleteMediaCollectionAsync(session.UserId, payload!.CollectionId);
        if (collection is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "media.collection.deleted", "media-collection", collection.Id, $"Soft deleted collection '{collection.Title}'.");
        return await responses.JsonAsync(request, new { collection });
    }

    [Function("MediaCollectionPublishReady")]
    public async Task<HttpResponseData> MediaCollectionPublishReady([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/collections/publish-ready")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaCollectionPublishReadyInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var collection = await repository.MarkCollectionReadyForPublishAsync(session.UserId, payload!.CollectionId);
        if (collection is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
        return await responses.JsonAsync(request, new { collection });
    }

    [Function("MediaCollectionItems")]
    public async Task<HttpResponseData> MediaCollectionItems([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "media/collections/{collectionId}/items")] HttpRequestData request, string collectionId)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        if (string.IsNullOrWhiteSpace(collectionId)) return await responses.ErrorAsync(request, "collection-id-required", HttpStatusCode.BadRequest);
        var items = await repository.ListMediaItemsForCollectionAsync(session.UserId, collectionId);
        if (items is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
        return await responses.JsonAsync(request, new { items });
    }

    [Function("MediaUploadIntake")]
    public async Task<HttpResponseData> MediaUploadIntake([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/uploads/intake")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaUploadIntakeInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var user = await repository.GetOrCreateUserAsync(session.Email);
        try
        {
            var created = await repository.CreateUploadIntakeAsync(user, session, payload!, HttpResponseFactory.GetHeader(request, "user-agent"), HttpResponseFactory.GetHeader(request, "x-forwarded-for").Split(',').FirstOrDefault()?.Trim() ?? string.Empty);
            if (created is null) return await responses.ErrorAsync(request, "collection-not-found", HttpStatusCode.NotFound);
            await repository.AppendAuditEventAsync(session.UserId, "media.upload.intake.created", "media-item", created.Value.MediaItem.Id, $"Created upload intake for '{created.Value.MediaItem.Title}'.");
            return await responses.JsonAsync(request, new { mediaItem = created.Value.MediaItem, upload = created.Value.Upload, workItems = created.Value.WorkItems }, HttpStatusCode.Created);
        }
        catch (InvalidOperationException ex) when (ex.Message == "folder-mismatch")
        {
            return await responses.ErrorAsync(request, "folder-mismatch", HttpStatusCode.BadRequest);
        }
        catch (InvalidOperationException ex) when (ex.Message == "upload-too-large")
        {
            return await responses.ErrorAsync(request, "upload-too-large", HttpStatusCode.BadRequest);
        }
        catch (InvalidOperationException ex) when (ex.Message == "storage-soft-cap-exceeded")
        {
            return await responses.ErrorAsync(request, "storage-soft-cap-exceeded", HttpStatusCode.Conflict);
        }
    }

    [Function("MediaUploadEvents")]
    public async Task<HttpResponseData> MediaUploadEvents([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "media/uploads/events")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var limit = int.TryParse(HttpResponseFactory.GetQuery(request, "limit"), out var parsed) ? Math.Clamp(parsed, 1, 100) : 50;
        return await responses.JsonAsync(request, new { events = await repository.ListUploadEventsAsync(session.UserId, limit) });
    }

    [Function("MediaUploadQueue")]
    public async Task<HttpResponseData> MediaUploadQueue([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "media/uploads/queue")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new { workItems = await repository.ListProcessingWorkItemsAsync(session.UserId) });
    }

    [Function("MediaPublishLogs")]
    public async Task<HttpResponseData> MediaPublishLogs([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "media/publishing/logs")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var collectionId = HttpResponseFactory.GetQuery(request, "collectionId");
        return await responses.JsonAsync(request, new { logs = await repository.ListPublishLogsAsync(session.UserId, string.IsNullOrWhiteSpace(collectionId) ? null : collectionId.Trim()) });
    }

    [Function("MediaItemUpdate")]
    public async Task<HttpResponseData> MediaItemUpdate([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/items/update")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaItemUpdateInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var mediaItem = await repository.UpdateMediaItemAsync(session.UserId, payload!);
        if (mediaItem is null) return await responses.ErrorAsync(request, "media-item-not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "media.item.updated", "media-item", mediaItem.Id, $"Updated media item '{mediaItem.Title}'.");
        return await responses.JsonAsync(request, new { mediaItem });
    }

    [Function("MediaItemDelete")]
    public async Task<HttpResponseData> MediaItemDelete([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/items/delete")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaItemDeleteInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var mediaItem = await repository.SoftDeleteMediaItemAsync(session.UserId, payload!.MediaItemId);
        if (mediaItem is null) return await responses.ErrorAsync(request, "media-item-not-found", HttpStatusCode.NotFound);
        await repository.AppendAuditEventAsync(session.UserId, "media.item.deleted", "media-item", mediaItem.Id, $"Soft deleted media item '{mediaItem.Title}'.");
        return await responses.JsonAsync(request, new { mediaItem });
    }

    [Function("AccountEarningsSummary")]
    public async Task<HttpResponseData> EarningsSummary([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "earnings/summary")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var earnings = await repository.GetAccountEarningsAsync(session.UserId);
        return await responses.JsonAsync(request, new { summary = earnings.Summary, timeseries = earnings.Timeseries });
    }

    [Function("AccountPayouts")]
    public async Task<HttpResponseData> Payouts([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "payouts")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var earnings = await repository.GetAccountEarningsAsync(session.UserId);
        return await responses.JsonAsync(request, new { payouts = await repository.ListPayoutRequestsAsync(session.UserId), summary = earnings.Summary });
    }

    [Function("AccountPayoutRequest")]
    public async Task<HttpResponseData> PayoutRequest([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "payouts/request")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<PayoutRequestInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var payout = await repository.CreatePayoutRequestAsync(session.UserId, payload!.AmountMinor, payload.Note, payload.Gateway);
        if (payout is null) return await responses.ErrorAsync(request, "amount-exceeds-available", HttpStatusCode.Conflict);
        await repository.AppendAuditEventAsync(session.UserId, "payout.request.created", "payout-request", payout.Id, "Requested payout from available balance.");
        return await responses.JsonAsync(request, new { payout }, HttpStatusCode.Created);
    }

    [Function("AccountWallet")]
    public async Task<HttpResponseData> Wallet([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "account/wallet")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new { wallet = await repository.GetOrCreateWalletAsync(session.UserId) });
    }

    [Function("AccountInvoices")]
    public async Task<HttpResponseData> Invoices([HttpTrigger(AuthorizationLevel.Anonymous, "get", "options", Route = "account/invoices")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        return await responses.JsonAsync(request, new { invoices = await repository.ListInvoicesAsync(session.UserId), purchases = await repository.ListPurchasesForBuyerAsync(session.UserId) });
    }

    [Function("OnlyFansManage")]
    public async Task<HttpResponseData> OnlyFansManage([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "account/platforms/onlyfans/manage")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var status = await repository.GetOnlyFansManagementStatusAsync(session.UserId);
        if (!status.Enabled) return await responses.ErrorAsync(request, "onlyfans-plugin-disabled", HttpStatusCode.Conflict);
        return await responses.JsonAsync(request, new { status });
    }

    [Function("MediaItemPurchase")]
    public async Task<HttpResponseData> PurchaseMediaItem([HttpTrigger(AuthorizationLevel.Anonymous, "post", "options", Route = "media/items/purchase")] HttpRequestData request)
    {
        if (HttpResponseFactory.IsOptions(request)) return responses.CreateOptions(request);
        var session = await authService.GetBearerSessionAsync(request);
        if (session is null) return await responses.ErrorAsync(request, "unauthorized", HttpStatusCode.Unauthorized);
        var (payload, errors) = await HttpResponseFactory.ReadAndValidateAsync<MediaPurchaseInput>(request);
        if (errors is not null) return await responses.ErrorAsync(request, "invalid-request", HttpStatusCode.BadRequest, errors);
        var result = await repository.CreateMediaPurchaseAsync(session, payload!);
        if (result.Error is not null)
        {
            var statusCode = result.Error switch
            {
                "adult-content-age-verification-required" => HttpStatusCode.Forbidden,
                "media-item-not-found" => HttpStatusCode.NotFound,
                "cannot-purchase-own-media" => HttpStatusCode.Conflict,
                "payment-method-not-allowed" => HttpStatusCode.Conflict,
                "purchase-amount-out-of-range" => HttpStatusCode.BadRequest,
                "payments-disabled" => HttpStatusCode.Conflict,
                "stripe-not-configured" => HttpStatusCode.Conflict,
                "insufficient-credits" => HttpStatusCode.Conflict,
                _ => HttpStatusCode.BadRequest,
            };
            return await responses.ErrorAsync(request, result.Error, statusCode);
        }

        await repository.AppendAuditEventAsync(session.UserId, "media.purchase.submitted", "media-item", payload!.MediaItemId, $"Submitted media purchase using {payload.PaymentMethod}.");
        return await responses.JsonAsync(request, new { purchase = result.Purchase, invoice = result.Invoice, wallet = result.Wallet, paymentSession = result.PaymentSession }, HttpStatusCode.Created);
    }
}
