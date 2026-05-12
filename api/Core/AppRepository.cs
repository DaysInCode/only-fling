using System.Security.Cryptography;
using System.Text.Json;

namespace OnlyFling.Api.Core;

public sealed partial class AppRepository(AppConfiguration configuration, JsonTableStore tables, UploadService uploadService)
{
    private readonly SeedData _memory = BuildSeed();

    private static string UtcNow() => DateTimeOffset.UtcNow.ToString("O");
    private static string DaysAgo(int days) => DateTimeOffset.UtcNow.AddDays(-days).ToString("O");
    private static string DaysAhead(int days) => DateTimeOffset.UtcNow.AddDays(days).ToString("O");
    private static string NormalizeKey(string value) => string.Concat(value.ToLowerInvariant().Select(ch => char.IsLetterOrDigit(ch) || ch == '-' ? ch : '-'));
    private static string CreateId(string prefix) => $"{prefix}-{Convert.ToHexString(RandomNumberGenerator.GetBytes(10)).ToLowerInvariant()}";

    private const string UsersTable = "users";
    private const string SessionsTable = "sessions";
    private const string ChallengesTable = "authchallenges";
    private const string OnboardingTable = "onboarding";
    private const string ItemsTable = "items";
    private const string AuditTable = "auditlog";
    private const string PlatformRequestsTable = "platformrequests";
    private const string AccountProfilesTable = "accountprofiles";
    private const string AccountSettingsTable = "accountsettings";
    private const string MediaCollectionsTable = "mediacollections";
    private const string MediaItemsTable = "mediaitems";
    private const string UploadEventsTable = "uploadevents";
    private const string PayoutRequestsTable = "payoutrequests";
    private const string VerificationTable = "verificationreadiness";
    private const string PreviewEnrollmentsTable = "previewenrollments";

    public async Task<AuthChallenge> CreateChallengeAsync(string email)
    {
        var challenge = new AuthChallenge
        {
            Id = CreateId("challenge"),
            Email = email.Trim(),
            Code = RandomNumberGenerator.GetInt32(100000, 1000000).ToString(),
            CreatedAt = UtcNow(),
            ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10).ToString("O"),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(ChallengesTable, NormalizeKey(email), challenge.Id, challenge);
            return challenge;
        }

        var key = NormalizeKey(email);
        if (!_memory.Challenges.TryGetValue(key, out var entries))
        {
            entries = [];
            _memory.Challenges[key] = entries;
        }
        entries.Add(challenge);
        return challenge;
    }

    public async Task<AuthChallenge?> VerifyChallengeAsync(string email, string code)
    {
        var key = NormalizeKey(email);
        var now = UtcNow();
        List<AuthChallenge> entries;
        if (tables.Enabled)
        {
            entries = await tables.ListAsync<AuthChallenge>(ChallengesTable, key);
        }
        else
        {
            entries = _memory.Challenges.TryGetValue(key, out var list) ? list : [];
        }

        return entries
            .Where(entry => string.Equals(entry.Code, code, StringComparison.Ordinal) && string.CompareOrdinal(entry.ExpiresAt, now) > 0)
            .OrderByDescending(entry => entry.CreatedAt)
            .FirstOrDefault();
    }

    public async Task<UserProfile> GetOrCreateUserAsync(string email)
    {
        var normalizedEmail = NormalizeKey(email);
        var storedUsers = tables.Enabled ? await tables.ListAsync<UserProfile>(UsersTable) : [];
        var existing = storedUsers.FirstOrDefault(entry => NormalizeKey(entry.Email) == normalizedEmail)
            ?? _memory.UsersByEmail.GetValueOrDefault(normalizedEmail);
        if (existing is not null)
        {
            return Clone(existing);
        }

        var created = new UserProfile
        {
            Id = CreateId("user"),
            Email = email.Trim(),
            Role = string.Equals(email.Trim(), configuration.AdminEmail, StringComparison.OrdinalIgnoreCase) ? "platformAdmin" : "creator",
            AccountTier = string.Equals(email.Trim(), configuration.AdminEmail, StringComparison.OrdinalIgnoreCase) ? "studio" : "starter",
            DisplayName = email.Split('@')[0],
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(UsersTable, normalizedEmail, "profile", created);
            return created;
        }

        _memory.Users[created.Id] = created;
        _memory.UsersByEmail[normalizedEmail] = created;
        return Clone(created);
    }

    public async Task<UserProfile?> UpdateUserDisplayNameAsync(string userId, string email, string displayName)
    {
        var normalizedEmail = NormalizeKey(email);
        var existing = await GetUserByIdAsync(userId);
        if (existing is null || !string.Equals(NormalizeKey(existing.Email), normalizedEmail, StringComparison.Ordinal))
        {
            return null;
        }

        existing.DisplayName = displayName.Trim();
        if (tables.Enabled)
        {
            await tables.UpsertAsync(UsersTable, normalizedEmail, "profile", existing);
            return existing;
        }

        _memory.Users[userId] = existing;
        _memory.UsersByEmail[normalizedEmail] = existing;
        return Clone(existing);
    }

    public async Task<SessionRecord> CreateSessionAsync(UserProfile user, string? deviceLabel, string? userAgent, string? ipAddress)
    {
        var now = UtcNow();
        var session = new SessionRecord
        {
            Id = CreateId("session"),
            Token = Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant(),
            UserId = user.Id,
            Email = user.Email,
            Role = user.Role,
            CreatedAt = now,
            LastSeenAt = now,
            ExpiresAt = DaysAhead(7),
            DeviceLabel = string.IsNullOrWhiteSpace(deviceLabel) ? null : deviceLabel.Trim(),
            UserAgent = string.IsNullOrWhiteSpace(userAgent) ? null : userAgent,
            IpAddress = string.IsNullOrWhiteSpace(ipAddress) ? null : ipAddress,
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(SessionsTable, "session", session.Token, session);
            return session;
        }

        _memory.Sessions[session.Token] = session;
        return Clone(session);
    }

    public async Task<SessionRecord?> GetSessionAsync(string token)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<SessionRecord>(SessionsTable, "session", token);
            if (stored is not null)
            {
                return stored;
            }
        }

        return _memory.Sessions.TryGetValue(token, out var session) ? Clone(session) : null;
    }

    public async Task<SessionRecord?> TouchSessionAsync(string token)
    {
        var existing = await GetSessionAsync(token);
        if (existing is null || existing.RevokedAt is not null)
        {
            return null;
        }

        existing.LastSeenAt = UtcNow();
        if (tables.Enabled)
        {
            await tables.UpsertAsync(SessionsTable, "session", token, existing);
            return existing;
        }

        _memory.Sessions[token] = existing;
        return Clone(existing);
    }

    public async Task<List<SessionRecord>> ListUserSessionsAsync(string userId)
    {
        var now = UtcNow();
        var stored = tables.Enabled ? await tables.ListAsync<SessionRecord>(SessionsTable, "session") : [];
        return MergeByKey(_memory.Sessions.Values, stored, session => session.Token)
            .Where(entry => entry.UserId == userId && entry.RevokedAt is null && string.CompareOrdinal(entry.ExpiresAt, now) > 0)
            .OrderByDescending(entry => entry.LastSeenAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<SessionRecord?> RevokeUserSessionAsync(string userId, string sessionId)
    {
        var session = (await ListUserSessionsAsync(userId)).FirstOrDefault(entry => entry.Id == sessionId);
        if (session is null)
        {
            return null;
        }

        session.RevokedAt = UtcNow();
        if (tables.Enabled)
        {
            await tables.UpsertAsync(SessionsTable, "session", session.Token, session);
            return session;
        }

        _memory.Sessions[session.Token] = session;
        return Clone(session);
    }

    public async Task<OnboardingRecord> SaveOnboardingAsync(string userId, OnboardingInput input)
    {
        var record = new OnboardingRecord
        {
            Id = CreateId("onboarding"),
            UserId = userId,
            WorkspaceName = input.WorkspaceName.Trim(),
            DisplayName = input.DisplayName.Trim(),
            Region = input.Region,
            AcceptsTerms = input.AcceptsTerms,
            AcceptsPrivacy = input.AcceptsPrivacy,
            AcceptsMarketplacePolicy = input.AcceptsMarketplacePolicy,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(OnboardingTable, userId, record.Id, record);
            return record;
        }

        _memory.Onboarding[userId] = record;
        return Clone(record);
    }

    public async Task<List<CatalogItem>> ListItemsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<CatalogItem>(ItemsTable) : [];
        return MergeByKey(_memory.Items.Values, stored, item => item.Id)
            .OrderByDescending(item => item.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<CatalogItem> CreateItemAsync(string userId, ItemInput input)
    {
        var item = new CatalogItem
        {
            Id = CreateId("item"),
            OwnerId = userId,
            Title = input.Title.Trim(),
            Description = input.Description.Trim(),
            PriceMinor = input.PriceMinor,
            Currency = input.Currency.Trim().ToUpperInvariant(),
            Type = input.Type,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(ItemsTable, userId, item.Id, item);
            return item;
        }

        _memory.Items[item.Id] = item;
        return Clone(item);
    }

    public async Task<AuditEvent> AppendAuditEventAsync(string actorId, string action, string targetType, string targetId, string details, string? accountId = null)
    {
        var audit = new AuditEvent
        {
            Id = CreateId("audit"),
            ActorId = actorId,
            AccountId = accountId ?? actorId,
            Action = action,
            TargetType = targetType,
            TargetId = targetId,
            Details = details,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(AuditTable, actorId, audit.Id, audit);
            return audit;
        }

        _memory.AuditLog.Insert(0, audit);
        return Clone(audit);
    }

    public async Task<List<AuditEvent>> ListAuditEventsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<AuditEvent>(AuditTable) : [];
        return MergeByKey(_memory.AuditLog, stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<List<AuditEvent>> ListAuditEventsForAccountAsync(string accountId)
    {
        var users = await ListUsersAsync();
        return (await ListAuditEventsAsync())
            .Where(entry => (entry.AccountId ?? entry.ActorId) == accountId)
            .Where(entry =>
            {
                var actorRole = users.FirstOrDefault(user => user.Id == entry.ActorId)?.Role;
                var isAdminActor = string.Equals(actorRole, "platformAdmin", StringComparison.OrdinalIgnoreCase);
                return !isAdminActor || entry.ActorId == accountId;
            })
            .ToList();
    }

    public Task<List<ModerationCase>> ListModerationCasesAsync()
        => Task.FromResult(_memory.ModerationCases.Select(Clone).ToList());

    public async Task<DashboardSummary> GetDashboardSummaryAsync()
    {
        var items = await ListItemsAsync();
        var cases = await ListModerationCasesAsync();
        var connectors = await ListConnectorDefinitionsAsync();
        var currentMonth = DateTimeOffset.UtcNow.ToString("yyyy-MM");
        var monthlyGrossMinor = _memory.EarningsLedger
            .Where(entry => entry.PeriodStart.StartsWith(currentMonth, StringComparison.Ordinal))
            .Sum(entry => entry.GrossMinor);
        return new DashboardSummary
        {
            Creators = (await ListUsersAsync()).Count,
            Items = items.Count,
            OpenModerationCases = cases.Count(entry => entry.Status == "open"),
            ActiveConnectors = connectors.Count(entry => entry.Status is "active" or "ready-for-config"),
            MonthlyGrossMinor = monthlyGrossMinor,
            Currency = "GBP",
        };
    }

    public async Task<List<UserProfile>> ListUsersAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<UserProfile>(UsersTable) : [];
        return MergeByKey(_memory.Users.Values, stored, user => user.Id)
            .OrderBy(user => user.DisplayName)
            .Select(Clone)
            .ToList();
    }

    public Task<List<SubscriptionSummary>> ListSubscriptionsAsync() => Task.FromResult(_memory.Subscriptions.Select(Clone).ToList());
    public Task<List<EarningsReportRow>> GetEarningsReportAsync() => Task.FromResult(_memory.EarningsReport.Select(Clone).ToList());
    public Task<List<LeadRecord>> ListLeadsAsync() => Task.FromResult(_memory.Leads.Select(Clone).ToList());
    public Task<List<QualificationRule>> QualificationRulesAsync() => Task.FromResult(_memory.QualificationRules.Select(Clone).ToList());

    public Task<CollaborationProfile?> GetCollaborationProfileAsync(string userId)
        => Task.FromResult(_memory.CollaborationProfiles.TryGetValue(userId, out var profile) ? Clone(profile) : null);

    public Task<CollaborationProfile> SaveCollaborationProfileAsync(string userId, CollaborationProfileInput input)
    {
        var now = UtcNow();
        var existing = _memory.CollaborationProfiles.TryGetValue(userId, out var profile) ? profile : null;
        var record = new CollaborationProfile
        {
            UserId = userId,
            DisplayName = input.DisplayName.Trim(),
            AvatarUrl = input.AvatarUrl.Trim(),
            Bio = input.Bio.Trim(),
            City = input.City.Trim(),
            CountryCode = input.CountryCode.Trim().ToUpperInvariant(),
            Latitude = input.Latitude,
            Longitude = input.Longitude,
            LocationDisclosureAccepted = input.LocationDisclosureAccepted,
            PromotedHighlight = input.PromotedHighlight,
            PromotedDisclosureAccepted = input.PromotedDisclosureAccepted,
            NotifyOnNearby = input.NotifyOnNearby,
            AvailableNow = input.AvailableNow,
            ContactHandle = input.ContactHandle.Trim(),
            Preferences = input.Preferences.Select(value => value.Trim()).Where(value => value.Length > 0).ToList(),
            CollaborationTypes = input.CollaborationTypes.ToList(),
            CreatedAt = existing?.CreatedAt ?? now,
            UpdatedAt = now,
        };
        _memory.CollaborationProfiles[userId] = record;
        return Task.FromResult(Clone(record));
    }

    public Task<List<NearbyMember>> FindNearbyMembersAsync(string viewerUserId, int maxKm)
    {
        if (!_memory.CollaborationProfiles.TryGetValue(viewerUserId, out var viewer) || !viewer.LocationDisclosureAccepted)
        {
            return Task.FromResult<List<NearbyMember>>([]);
        }

        var nearby = _memory.CollaborationProfiles.Values
            .Where(profile => profile.UserId != viewerUserId && profile.LocationDisclosureAccepted)
            .Select(profile => new NearbyMember
            {
                UserId = profile.UserId,
                DisplayName = profile.DisplayName,
                AvatarUrl = profile.AvatarUrl,
                City = profile.City,
                PromotedHighlight = profile.PromotedHighlight,
                AvailableNow = profile.AvailableNow,
                Preferences = [.. profile.Preferences],
                CollaborationTypes = [.. profile.CollaborationTypes],
                DistanceKm = Math.Round(DistanceKm(viewer.Latitude, viewer.Longitude, profile.Latitude, profile.Longitude), 1),
                PredictedAffinity = PredictedAffinity(viewer, profile),
                CanRequestContact = true,
            })
            .Where(entry => entry.DistanceKm <= maxKm)
            .OrderByDescending(entry => entry.PromotedHighlight)
            .ThenByDescending(entry => entry.AvailableNow)
            .ThenByDescending(entry => entry.PredictedAffinity)
            .ThenBy(entry => entry.DistanceKm)
            .ToList();

        return Task.FromResult(nearby);
    }

    public Task<List<CollaborationAlert>> RefreshAlertsForUserAsync(string userId)
    {
        if (!_memory.CollaborationProfiles.TryGetValue(userId, out var viewer) || !viewer.NotifyOnNearby)
        {
            return Task.FromResult<List<CollaborationAlert>>([]);
        }

        var alerts = FindNearbyMembersAsync(userId, 35).Result
            .Where(entry => entry.AvailableNow)
            .Take(3)
            .Select(entry =>
            {
                var target = _memory.CollaborationProfiles[entry.UserId];
                return new CollaborationAlert
                {
                    Id = $"alert-{userId}-{entry.UserId}",
                    UserId = userId,
                    TargetUserId = entry.UserId,
                    Title = $"{target.DisplayName} is nearby",
                    Body = $"{target.DisplayName} is available in {target.City} for {string.Join(" / ", target.CollaborationTypes)} collaborations.",
                    Status = "new",
                    CreatedAt = UtcNow(),
                };
            })
            .ToList();

        _memory.CollaborationAlerts[userId] = alerts;
        return Task.FromResult(alerts.Select(Clone).ToList());
    }

    public Task<List<CollaborationAlert>> ListAlertsAsync(string userId)
        => Task.FromResult((_memory.CollaborationAlerts.TryGetValue(userId, out var alerts) ? alerts : []).Select(Clone).ToList());

    public Task<CollaborationRequest> CreateCollaborationRequestAsync(string fromUserId, string toUserId, string collaborationType, string note)
    {
        var request = new CollaborationRequest
        {
            Id = CreateId("request"),
            FromUserId = fromUserId,
            ToUserId = toUserId,
            CollaborationType = collaborationType,
            Note = note.Trim(),
            Status = "pending",
            CreatedAt = UtcNow(),
        };
        _memory.CollaborationRequests[request.Id] = request;

        if (_memory.CollaborationProfiles.TryGetValue(toUserId, out var targetProfile))
        {
            if (!_memory.CollaborationAlerts.TryGetValue(toUserId, out var alerts))
            {
                alerts = [];
                _memory.CollaborationAlerts[toUserId] = alerts;
            }
            alerts.Insert(0, new CollaborationAlert
            {
                Id = CreateId("alert"),
                UserId = toUserId,
                TargetUserId = fromUserId,
                Title = $"{_memory.CollaborationProfiles.GetValueOrDefault(fromUserId)?.DisplayName ?? "A member"} wants to connect",
                Body = $"{collaborationType} collaboration request in {targetProfile.City}.",
                Status = "new",
                CreatedAt = UtcNow(),
            });
        }

        return Task.FromResult(Clone(request));
    }

    public Task<CollaborationRequest?> RespondToCollaborationRequestAsync(string requestId, string actorUserId, bool accept)
    {
        if (!_memory.CollaborationRequests.TryGetValue(requestId, out var request) || request.ToUserId != actorUserId)
        {
            return Task.FromResult<CollaborationRequest?>(null);
        }

        request.Status = accept ? "accepted" : "declined";
        request.RespondedAt = UtcNow();

        if (accept && _memory.CollaborationProfiles.TryGetValue(request.FromUserId, out var fromProfile) && _memory.CollaborationProfiles.TryGetValue(request.ToUserId, out var toProfile))
        {
            UpsertAlert(request.FromUserId, new CollaborationAlert
            {
                Id = CreateId("alert"),
                UserId = request.FromUserId,
                TargetUserId = request.ToUserId,
                Title = $"{toProfile.DisplayName} accepted your request",
                Body = $"You can now contact {toProfile.ContactHandle}. They will also receive {fromProfile.ContactHandle}.",
                Status = "new",
                CreatedAt = UtcNow(),
            });
            UpsertAlert(request.ToUserId, new CollaborationAlert
            {
                Id = CreateId("alert"),
                UserId = request.ToUserId,
                TargetUserId = request.FromUserId,
                Title = $"Contact released for {fromProfile.DisplayName}",
                Body = $"You can now contact {fromProfile.ContactHandle}.",
                Status = "new",
                CreatedAt = UtcNow(),
            });
        }

        return Task.FromResult<CollaborationRequest?>(Clone(request));
    }

    public Task<List<CollaborationRequest>> ListCollaborationRequestsAsync(string userId)
        => Task.FromResult(_memory.CollaborationRequests.Values.Where(entry => entry.FromUserId == userId || entry.ToUserId == userId).Select(Clone).ToList());

    public Task<List<CollaborationProfile>> ListAllCollaborationProfilesAsync()
        => Task.FromResult(_memory.CollaborationProfiles.Values.Select(Clone).ToList());

    public async Task<List<PlatformRequest>> ListPlatformRequestsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<PlatformRequest>(PlatformRequestsTable, "platform") : [];
        return MergeByKey(_memory.PlatformRequests, stored, request => request.Id)
            .OrderByDescending(request => request.Votes)
            .ThenBy(request => request.PlatformName)
            .Select(Clone)
            .ToList();
    }

    public async Task<PlatformRequest> CreatePlatformRequestAsync(string userId, string requestedByDisplayName, string platformName, string type, string note)
    {
        var request = new PlatformRequest
        {
            Id = CreateId("platform-request"),
            UserId = userId,
            PlatformName = platformName.Trim(),
            Type = type,
            Note = note.Trim(),
            RequestedByDisplayName = requestedByDisplayName,
            Status = "new",
            Votes = 1,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(PlatformRequestsTable, "platform", request.Id, request);
            return request;
        }

        _memory.PlatformRequests.Insert(0, request);
        return Clone(request);
    }

    public Task<AffiliateCampaign?> GetAffiliateCampaignAsync(string userId)
        => Task.FromResult(_memory.AffiliateCampaigns.FirstOrDefault(campaign => campaign.OwnerUserId == userId) is { } campaign ? Clone(campaign) : null);

    public Task<AffiliateCampaign> SaveAffiliateCampaignAsync(string userId, string ownerDisplayName, AffiliateCampaignInput input)
    {
        var existing = _memory.AffiliateCampaigns.FirstOrDefault(campaign => campaign.OwnerUserId == userId);
        if (existing is not null)
        {
            existing.CtaCopy = input.CtaCopy.Trim();
            existing.RewardPercent = input.RewardPercent;
            existing.CapSalesCount = input.CapSalesCount;
            existing.CapDays = input.CapDays;
            return Task.FromResult(Clone(existing));
        }

        var created = new AffiliateCampaign
        {
            Id = CreateId("affiliate"),
            OwnerUserId = userId,
            OwnerDisplayName = ownerDisplayName,
            ShareCode = $"{NormalizeKey(ownerDisplayName).Trim('-')}-{CreateId("share")[..6]}",
            CtaCopy = input.CtaCopy.Trim(),
            RewardPercent = input.RewardPercent,
            CapSalesCount = input.CapSalesCount,
            CapDays = input.CapDays,
            ActiveReferrals = 0,
            RewardMinorPaid = 0,
            Currency = "GBP",
            CreatedAt = UtcNow(),
        };
        _memory.AffiliateCampaigns.Insert(0, created);
        return Task.FromResult(Clone(created));
    }

    public Task<List<MemberRequest>> ListMemberRequestsAsync(string userId)
        => Task.FromResult(_memory.MemberRequests.Where(request => request.RequesterUserId == userId || request.TargetUserId == userId).Select(Clone).ToList());

    public Task<MemberRequest> CreateMemberRequestAsync(string requesterUserId, string requesterDisplayName, string targetUserId, string targetDisplayName, string title, string details, string type)
    {
        var request = new MemberRequest
        {
            Id = CreateId("member-request"),
            RequesterUserId = requesterUserId,
            RequesterDisplayName = requesterDisplayName,
            TargetUserId = targetUserId,
            TargetDisplayName = targetDisplayName,
            Title = title.Trim(),
            Details = details.Trim(),
            Type = type,
            Status = "open",
            CreatedAt = UtcNow(),
        };
        _memory.MemberRequests.Insert(0, request);
        return Task.FromResult(Clone(request));
    }

    public Task<MemberRequest?> ActOnMemberRequestAsync(string requestId, string actorUserId, string action)
    {
        var request = _memory.MemberRequests.FirstOrDefault(entry => entry.Id == requestId);
        if (request is null)
        {
            return Task.FromResult<MemberRequest?>(null);
        }

        switch (action)
        {
            case "accept":
                request.Status = "accepted";
                request.PromisedByUserId = actorUserId;
                request.PromisedAt = UtcNow();
                break;
            case "fulfill":
                request.Status = "fulfilled";
                request.FulfilledAt = UtcNow();
                break;
            case "dispute":
                request.Status = "disputed";
                break;
        }

        return Task.FromResult<MemberRequest?>(Clone(request));
    }

    public Task<List<StudioSession>> ListStudioSessionsAsync(string userId)
        => Task.FromResult(_memory.StudioSessions.Where(session => session.CreatorAUserId == userId || session.CreatorBUserId == userId).Select(Clone).ToList());

    public Task<List<StudioSession>> ListAllStudioSessionsAsync()
        => Task.FromResult(_memory.StudioSessions.Select(Clone).ToList());

    public Task<List<StudioTimelineEntry>> ListStudioTimelineAsync(string sessionId)
        => Task.FromResult(_memory.StudioTimeline.Where(entry => entry.SessionId == sessionId).OrderByDescending(entry => entry.Timestamp).Select(Clone).ToList());

    public Task<StudioSession> CreateStudioSessionAsync(string initiatorUserId, string initiatorDisplayName, string partnerUserId, string partnerDisplayName, StudioSessionInput input)
    {
        var netMinor = input.GrossMinor - input.FeesMinor;
        var creatorAShareMinor = (int)Math.Round(netMinor * 0.6);
        var creatorBShareMinor = netMinor - creatorAShareMinor;
        var session = new StudioSession
        {
            Id = CreateId("studio-session"),
            Title = input.Title.Trim(),
            InitiatorUserId = initiatorUserId,
            CreatorAUserId = initiatorUserId,
            CreatorADisplayName = initiatorDisplayName,
            CreatorBUserId = partnerUserId,
            CreatorBDisplayName = partnerDisplayName,
            ContentType = input.ContentType,
            SessionMode = input.SessionMode,
            Status = "pending_partner_confirm",
            GrossMinor = input.GrossMinor,
            FeesMinor = input.FeesMinor,
            NetMinor = netMinor,
            CreatorAShareMinor = creatorAShareMinor,
            CreatorBShareMinor = creatorBShareMinor,
            CreatorASharePercent = 60,
            CreatorBSharePercent = 40,
            PartnerConfirmed = false,
            CreatedAt = UtcNow(),
        };
        _memory.StudioSessions.Insert(0, session);
        _memory.StudioTimeline.Insert(0, new StudioTimelineEntry
        {
            Id = CreateId("timeline"),
            SessionId = session.Id,
            Timestamp = UtcNow(),
            ActorDisplayName = initiatorDisplayName,
            EventType = "split.initiated",
            Description = "Initiator created the fixed 60/40 split.",
        });
        return Task.FromResult(Clone(session));
    }

    public Task<StudioSession?> ActOnStudioSessionAsync(string sessionId, string actorUserId, string actorDisplayName, string action)
    {
        var session = _memory.StudioSessions.FirstOrDefault(entry => entry.Id == sessionId);
        if (session is null)
        {
            return Task.FromResult<StudioSession?>(null);
        }

        var eventType = "split.confirmed";
        var description = string.Empty;
        switch (action)
        {
            case "confirm-split":
                session.PartnerConfirmed = true;
                session.Status = "both_confirmed";
                eventType = "split.confirmed";
                description = $"{actorDisplayName} agreed to the fixed 60/40 split.";
                break;
            case "start-session":
                session.Status = "live";
                eventType = "session.started";
                description = $"{actorDisplayName} started the {session.SessionMode} session.";
                break;
            case "initiate-payout":
                session.Status = "payout_initiated";
                eventType = "payout.initiated";
                description = $"{actorDisplayName} initiated payout settlement.";
                break;
            case "approve-payout":
                if (actorUserId == session.CreatorAUserId)
                {
                    session.Status = session.Status == "payout_approved_creator_b" ? "settled" : "payout_approved_creator_a";
                }
                else if (actorUserId == session.CreatorBUserId)
                {
                    session.Status = session.Status == "payout_approved_creator_a" ? "settled" : "payout_approved_creator_b";
                }
                eventType = session.Status == "settled" ? "payout.settled" : "payout.approved";
                description = session.Status == "settled"
                    ? $"{actorDisplayName} completed final payout approval and settlement was recorded."
                    : $"{actorDisplayName} approved the payout.";
                break;
            case "dispute":
                session.Status = "disputed";
                eventType = "session.disputed";
                description = $"{actorDisplayName} opened a dispute on the session.";
                break;
        }

        _memory.StudioTimeline.Insert(0, new StudioTimelineEntry
        {
            Id = CreateId("timeline"),
            SessionId = sessionId,
            Timestamp = UtcNow(),
            ActorDisplayName = actorDisplayName,
            EventType = eventType,
            Description = description,
        });
        return Task.FromResult<StudioSession?>(Clone(session));
    }

    public async Task<UserAccountProfile> GetOrCreateAccountProfileAsync(UserProfile user)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<UserAccountProfile>(AccountProfilesTable, user.Id, "profile");
            if (stored is not null) return stored;
        }

        if (_memory.AccountProfiles.TryGetValue(user.Id, out var existing))
        {
            return Clone(existing);
        }

        var created = DefaultProfile(user);
        if (tables.Enabled)
        {
            await tables.UpsertAsync(AccountProfilesTable, user.Id, "profile", created);
            return created;
        }

        _memory.AccountProfiles[user.Id] = created;
        return Clone(created);
    }

    public async Task<UserAccountProfile> UpdateAccountProfileAsync(UserProfile user, AccountProfileInput input)
    {
        var existing = await GetOrCreateAccountProfileAsync(user);
        var updated = new UserAccountProfile
        {
            UserId = user.Id,
            DisplayName = input.DisplayName.Trim(),
            Bio = input.Bio.Trim(),
            AvatarUrl = input.AvatarUrl.Trim(),
            Preferences = new AccountPreferences
            {
                ContentTags = input.Preferences.ContentTags.Select(value => value.Trim()).Where(value => value.Length > 0).ToList(),
                CollaborationInterests = input.Preferences.CollaborationInterests.Select(value => value.Trim()).Where(value => value.Length > 0).ToList(),
                Languages = input.Preferences.Languages.Select(value => value.Trim()).Where(value => value.Length > 0).ToList(),
            },
            Privacy = input.Privacy,
            Contact = input.Contact,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(AccountProfilesTable, user.Id, "profile", updated);
            return updated;
        }

        _memory.AccountProfiles[user.Id] = updated;
        return Clone(updated);
    }

    public async Task<AccountSettings> GetOrCreateAccountSettingsAsync(string userId, int sessionCount = 0)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<AccountSettings>(AccountSettingsTable, userId, "settings");
            if (stored is not null)
            {
                stored.DeviceSync.SessionCount = sessionCount;
                return stored;
            }
        }

        if (_memory.AccountSettings.TryGetValue(userId, out var existing))
        {
            var clone = Clone(existing);
            clone.DeviceSync.SessionCount = sessionCount;
            return clone;
        }

        var created = DefaultSettings(userId);
        created.DeviceSync.SessionCount = sessionCount;
        if (tables.Enabled)
        {
            await tables.UpsertAsync(AccountSettingsTable, userId, "settings", created);
            return created;
        }

        _memory.AccountSettings[userId] = created;
        return Clone(created);
    }

    public async Task<AccountSettings> UpdateAccountSettingsAsync(string userId, AccountSettingsInput input, int sessionCount)
    {
        var existing = await GetOrCreateAccountSettingsAsync(userId, sessionCount);
        var updated = new AccountSettings
        {
            UserId = userId,
            Notifications = input.Notifications,
            DeviceSync = new DeviceSyncSettings
            {
                Enabled = input.DeviceSync.Enabled,
                CanonicalUpdatedAt = UtcNow(),
                LastSyncedSessionId = input.DeviceSync.LastSyncedSessionId,
                SessionCount = sessionCount,
            },
            PayoutPreferences = new PayoutPreferences
            {
                SettlementCurrency = input.PayoutPreferences.SettlementCurrency.Trim().ToUpperInvariant(),
                Schedule = input.PayoutPreferences.Schedule,
                MethodStatus = input.PayoutPreferences.MethodStatus,
            },
            PurchasePreferences = new PurchasePreferenceSettings
            {
                AgeVerifiedAdult = input.PurchasePreferences.AgeVerifiedAdult,
                LabelAsEntertainment = input.PurchasePreferences.LabelAsEntertainment,
                EntertainmentLabelValue = string.IsNullOrWhiteSpace(input.PurchasePreferences.EntertainmentLabelValue)
                    ? "Entertainment content"
                    : input.PurchasePreferences.EntertainmentLabelValue.Trim(),
            },
            PublishPreferences = new PublishPreferenceSettings
            {
                AutoPublishEnabled = input.PublishPreferences.AutoPublishEnabled,
                DesiredPlatforms = input.PublishPreferences.DesiredPlatforms
                    .Select(platform => platform.Trim().ToLowerInvariant())
                    .Where(platform => platform.Length > 0)
                    .Distinct(StringComparer.Ordinal)
                    .ToList(),
            },
            CloseAccount = existing.CloseAccount,
            CreatedAt = existing.CreatedAt,
            UpdatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(AccountSettingsTable, userId, "settings", updated);
            return updated;
        }

        _memory.AccountSettings[userId] = updated;
        return Clone(updated);
    }

    public async Task<AccountSettings> RequestCloseAccountAsync(UserProfile user, string sessionId, string reason, string action)
    {
        var existing = await GetOrCreateAccountSettingsAsync(user.Id);
        var now = UtcNow();
        existing.CloseAccount = action == "request"
            ? new CloseAccountState
            {
                Status = "requested",
                RequestedAt = now,
                RequestedBySessionId = sessionId,
                Reason = reason,
                RetentionAcknowledged = true,
                AccessLossAcknowledged = true,
            }
            : new CloseAccountState
            {
                Status = "closed",
                RequestedAt = existing.CloseAccount.RequestedAt ?? now,
                RequestedBySessionId = existing.CloseAccount.RequestedBySessionId ?? sessionId,
                ClosedAt = now,
                Reason = string.IsNullOrWhiteSpace(reason) ? existing.CloseAccount.Reason : reason,
                RetentionAcknowledged = true,
                AccessLossAcknowledged = true,
            };
        existing.UpdatedAt = now;

        if (tables.Enabled)
        {
            await tables.UpsertAsync(AccountSettingsTable, user.Id, "settings", existing);
            return existing;
        }

        _memory.AccountSettings[user.Id] = existing;
        return Clone(existing);
    }

    public async Task<List<MediaCollection>> ListMediaCollectionsAsync(string ownerId)
    {
        var collections = tables.Enabled ? await tables.ListAsync<MediaCollection>(MediaCollectionsTable, ownerId) : [];
        var items = tables.Enabled ? await tables.ListAsync<MediaItem>(MediaItemsTable, ownerId) : [];
        var mergedCollections = MergeByKey(_memory.MediaCollections.Values.Where(entry => entry.OwnerId == ownerId), collections, entry => entry.Id);
        var mergedItems = MergeByKey(_memory.MediaItems.Values.Where(entry => entry.OwnerId == ownerId), items, entry => entry.Id);

        return mergedCollections
            .Where(collection => collection.OwnerId == ownerId && collection.Status != "deleted")
            .Select(collection =>
            {
                var totals = GetCollectionTotals(collection, mergedItems);
                collection.SoldCount = totals.SoldCount;
                collection.EarnedMinor = totals.EarnedMinor;
                return Clone(collection);
            })
            .OrderByDescending(collection => collection.UpdatedAt)
            .ToList();
    }

    public async Task<MediaCollection?> CreateMediaCollectionAsync(string ownerId, MediaCollectionInput input)
    {
        var now = UtcNow();
        var collection = new MediaCollection
        {
            Id = CreateId("collection"),
            OwnerId = ownerId,
            FolderName = input.FolderName.Trim(),
            Title = input.Title.Trim(),
            Description = input.Description.Trim(),
            Visibility = input.Visibility,
            PublishState = "draft",
            PriceMinor = input.PriceMinor,
            Currency = input.Currency.Trim().ToUpperInvariant(),
            PublishMetadata = new FolderPublishMetadata
            {
                CaptionTemplate = input.PublishMetadata.CaptionTemplate.Trim(),
                Hashtags = input.PublishMetadata.Hashtags.Select(tag => tag.Trim()).Where(tag => tag.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                ContentCategory = string.IsNullOrWhiteSpace(input.PublishMetadata.ContentCategory) ? "general" : input.PublishMetadata.ContentCategory.Trim().ToLowerInvariant(),
            },
            SoldCount = 0,
            EarnedMinor = 0,
            Status = "active",
            CreatedAt = now,
            UpdatedAt = now,
        };
        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaCollectionsTable, ownerId, collection.Id, collection);
            return collection;
        }

        _memory.MediaCollections[collection.Id] = collection;
        return Clone(collection);
    }

    public async Task<MediaCollection?> UpdateMediaCollectionAsync(string ownerId, MediaCollectionUpdateInput input)
    {
        var collection = await GetCollectionAsync(ownerId, input.CollectionId);
        if (collection is null || collection.OwnerId != ownerId || collection.Status == "deleted")
        {
            return null;
        }

        collection.FolderName = input.FolderName.Trim();
        collection.Title = input.Title.Trim();
        collection.Description = input.Description.Trim();
        collection.Visibility = input.Visibility;
        collection.PublishState = collection.PublishApprovalStatus == "approved" ? input.PublishState : "draft";
        collection.PublishMetadata = new FolderPublishMetadata
        {
            CaptionTemplate = input.PublishMetadata.CaptionTemplate.Trim(),
            Hashtags = input.PublishMetadata.Hashtags.Select(tag => tag.Trim()).Where(tag => tag.Length > 0).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            ContentCategory = string.IsNullOrWhiteSpace(input.PublishMetadata.ContentCategory) ? "general" : input.PublishMetadata.ContentCategory.Trim().ToLowerInvariant(),
        };
        collection.PriceMinor = input.PriceMinor;
        collection.Currency = input.Currency.Trim().ToUpperInvariant();
        collection.UpdatedAt = UtcNow();

        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaCollectionsTable, ownerId, collection.Id, collection);
            return collection;
        }

        _memory.MediaCollections[collection.Id] = collection;
        return Clone(collection);
    }

    public async Task<MediaCollection?> SoftDeleteMediaCollectionAsync(string ownerId, string collectionId)
    {
        var collection = await GetCollectionAsync(ownerId, collectionId);
        if (collection is null || collection.OwnerId != ownerId || collection.Status == "deleted")
        {
            return null;
        }

        collection.Status = "deleted";
        collection.DeletedAt = UtcNow();
        collection.UpdatedAt = collection.DeletedAt;
        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaCollectionsTable, ownerId, collection.Id, collection);
            return collection;
        }

        _memory.MediaCollections[collection.Id] = collection;
        return Clone(collection);
    }

    public async Task<List<MediaItem>?> ListMediaItemsForCollectionAsync(string ownerId, string collectionId)
    {
        var collection = await GetCollectionAsync(ownerId, collectionId);
        if (collection is null || collection.OwnerId != ownerId || collection.Status == "deleted")
        {
            return null;
        }

        var stored = tables.Enabled ? await tables.ListAsync<MediaItem>(MediaItemsTable, ownerId) : [];
        return MergeByKey(_memory.MediaItems.Values.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id)
            .Where(item => item.CollectionId == collectionId && string.IsNullOrWhiteSpace(item.DeletedAt))
            .OrderByDescending(item => item.UpdatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<(MediaItem MediaItem, UploadTarget Upload, List<ProcessingWorkItem> WorkItems)?> CreateUploadIntakeAsync(UserProfile owner, SessionRecord session, MediaUploadIntakeInput input, string userAgent, string ipAddress)
    {
        var collection = await GetCollectionAsync(owner.Id, input.CollectionId);
        if (collection is null || collection.OwnerId != owner.Id || collection.Status == "deleted") return null;
        if (!string.Equals(input.Policy.FolderName.Trim(), collection.FolderName, StringComparison.Ordinal)) throw new InvalidOperationException("folder-mismatch");
        var mediaCap = input.MediaType == "video" ? configuration.System.VideoMaxUploadBytes : configuration.System.ImageMaxUploadBytes;
        var tier = configuration.System.AccountTierQuotas.TryGetValue(owner.AccountTier, out var configuredTier)
            ? configuredTier
            : configuration.System.AccountTierQuotas["starter"];
        var ownerMedia = await ListAllMediaItemsAsync(owner.Id);
        var usedByOwner = ownerMedia.Where(item => string.IsNullOrWhiteSpace(item.DeletedAt)).Sum(item => item.FileSizeBytes);
        if (input.FileSizeBytes > mediaCap || input.FileSizeBytes > tier.MaxUploadBytes) throw new InvalidOperationException("upload-too-large");
        if (usedByOwner + input.FileSizeBytes > tier.MonthlyStorageSoftCapBytes) throw new InvalidOperationException("storage-soft-cap-exceeded");

        var markdown = BuildPolicyMarkdown(owner.DisplayName, collection, input, owner.Id);
        var persisted = await uploadService.PersistPolicyArtifactAsync(input.Policy.FolderName, input.Policy.DocumentName, markdown);
        var upload = await uploadService.CreateUploadUrlAsync(input.FileName, input.ContentType);
        var now = UtcNow();
        var downloadName = uploadService.CreateDownloadName(input.MediaType, input.ContentType);
        var mediaItem = new MediaItem
        {
            Id = CreateId("media"),
            OwnerId = owner.Id,
            CollectionId = collection.Id,
            FolderName = input.Policy.FolderName.Trim(),
            Title = input.Title.Trim(),
            Description = input.Description.Trim(),
            FileName = downloadName,
            ContentType = input.ContentType.Trim(),
            MediaType = input.MediaType,
            AgeRating = input.AgeRating,
            FileSizeBytes = input.FileSizeBytes,
            UploadStatus = "pending",
            PublishState = collection.PublishApprovalStatus == "approved" ? input.PublishState : "draft",
            PriceMinor = input.PriceMinor,
            Currency = input.Currency.Trim().ToUpperInvariant(),
            SoldCount = 0,
            EarnedMinor = 0,
            BlobUrl = upload.BlobUrl,
            UploadUrl = upload.UploadUrl,
            UploadMode = upload.Mode,
            ExpiresAt = upload.ExpiresAt,
            RequiredHeaders = upload.RequiredHeaders,
            BackgroundStreamId = CreateId("stream"),
            BackgroundUpdatedAt = now,
            Storage = new MediaStorageDescriptor
            {
                BlobName = upload.BlobUrl.Replace("memory://", string.Empty, StringComparison.OrdinalIgnoreCase),
                DownloadFileName = downloadName,
                SizeBytes = input.FileSizeBytes,
                PublicMetadata = new Dictionary<string, string>
                {
                    ["contentClass"] = input.MediaType,
                    ["identitySafe"] = "true",
                    ["rating"] = input.AgeRating,
                    ["qualityProfile"] = input.EncodingProfile.QualityProfile,
                    ["bitrateProfile"] = input.EncodingProfile.BitrateProfile,
                },
            },
            EncodingProfile = new EncodingProfileMetadata
            {
                QualityProfile = input.EncodingProfile.QualityProfile,
                BitrateProfile = input.EncodingProfile.BitrateProfile,
            },
            Preview = new MediaPreviewContract
            {
                Status = input.MediaType == "video" ? "queued" : "pending",
                PosterFileName = input.MediaType == "video" ? uploadService.CreateDownloadName("poster", "image/jpeg") : null,
            },
            Consent = new ConsentMetadata
            {
                PerformerCount = input.Consent.PerformerCount,
                AllAdultsConfirmed = input.Consent.AllAdultsConfirmed,
                RightsConfirmed = input.Consent.RightsConfirmed,
                ConsentCapturedAt = input.Consent.ConsentCapturedAt,
                ConsentDocumentName = input.Consent.ConsentDocumentName.Trim(),
                RecordRetentionYears = input.Consent.RecordRetentionYears,
                Notes = input.Consent.Notes.Trim(),
            },
            PolicyArtifact = new PolicyArtifactRecord
            {
                Id = CreateId("policy"),
                OwnerId = owner.Id,
                FolderName = input.Policy.FolderName.Trim(),
                DocumentName = input.Policy.DocumentName.Trim(),
                FileName = persisted.FileName,
                Uri = persisted.Uri,
                CreatedAt = now,
            },
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaItemsTable, owner.Id, mediaItem.Id, mediaItem);
        }
        else
        {
            _memory.MediaItems[mediaItem.Id] = mediaItem;
        }

        var evt = await AppendUploadEventAsync(owner.Id, mediaItem.Id, "pending", "Upload intake created and awaiting transfer.");
        mediaItem.BackgroundUpdatedAt = evt.CreatedAt;
        await CaptureUploadMetadataAsync(session, mediaItem, input.FileName, input.ContentType, userAgent, ipAddress);
        var workItems = await CreateProcessingWorkItemsAsync(mediaItem);
        return (Clone(mediaItem), upload, workItems);
    }

    public async Task<MediaItem?> UpdateMediaItemAsync(string ownerId, MediaItemUpdateInput input)
    {
        var item = await GetMediaItemAsync(ownerId, input.MediaItemId);
        if (item is null || item.OwnerId != ownerId || !string.IsNullOrWhiteSpace(item.DeletedAt)) return null;
        item.Title = input.Title.Trim();
        item.Description = input.Description.Trim();
        item.PriceMinor = input.PriceMinor;
        item.Currency = input.Currency.Trim().ToUpperInvariant();
        var collection = await GetCollectionAsync(ownerId, item.CollectionId);
        item.PublishState = collection?.PublishApprovalStatus == "approved" ? input.PublishState : "draft";
        item.UpdatedAt = UtcNow();

        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaItemsTable, ownerId, item.Id, item);
            return item;
        }

        _memory.MediaItems[item.Id] = item;
        return Clone(item);
    }

    public async Task<MediaItem?> SoftDeleteMediaItemAsync(string ownerId, string mediaItemId)
    {
        var item = await GetMediaItemAsync(ownerId, mediaItemId);
        if (item is null || item.OwnerId != ownerId || !string.IsNullOrWhiteSpace(item.DeletedAt)) return null;
        var now = UtcNow();
        item.UploadStatus = "deleted";
        item.DeletedAt = now;
        item.UpdatedAt = now;
        item.BackgroundUpdatedAt = now;
        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaItemsTable, ownerId, item.Id, item);
        }
        else
        {
            _memory.MediaItems[item.Id] = item;
        }
        await AppendUploadEventAsync(ownerId, item.Id, "deleted", "Media item marked deleted and removed from active views.");
        return Clone(item);
    }

    public async Task<List<UploadStatusEvent>> ListUploadEventsAsync(string ownerId, int limit)
    {
        var boundedLimit = Math.Clamp(limit, 1, 100);
        var stored = tables.Enabled ? await tables.ListAsync<UploadStatusEvent>(UploadEventsTable, ownerId) : [];
        return MergeByKey(_memory.UploadEvents.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Take(boundedLimit)
            .Select(Clone)
            .ToList();
    }

    public async Task<(AccountEarningsSummary Summary, List<EarningsSeriesPoint> Timeseries)> GetAccountEarningsAsync(string userId)
    {
        var timeseries = (await ListEarningsLedgerAsync(userId))
            .OrderBy(entry => entry.PeriodStart)
            .Select(entry => new EarningsSeriesPoint
            {
                PeriodStart = entry.PeriodStart,
                GrossMinor = entry.GrossMinor,
                NetMinor = entry.NetMinor,
                FeesMinor = entry.FeesMinor,
                SoldCount = entry.SoldCount,
                Currency = entry.Currency,
            })
            .ToList();
        var totalGross = timeseries.Sum(point => point.GrossMinor);
        var totalNet = timeseries.Sum(point => point.NetMinor);
        var totalFees = timeseries.Sum(point => point.FeesMinor);
        var payouts = await ListPayoutRequestsAsync(userId);
        var pending = payouts.Where(entry => entry.Status is "pending" or "processing").Sum(entry => entry.AmountMinor);
        var paid = payouts.Where(entry => entry.Status == "paid").Sum(entry => entry.AmountMinor);
        return (new AccountEarningsSummary
        {
            AccountId = userId,
            TotalGrossMinor = totalGross,
            TotalNetMinor = totalNet,
            TotalFeesMinor = totalFees,
            AvailableForPayoutMinor = Math.Max(0, totalNet - pending - paid),
            PendingPayoutMinor = pending,
            PaidOutMinor = paid,
            Currency = timeseries.FirstOrDefault()?.Currency ?? "GBP",
            RangeStart = timeseries.FirstOrDefault()?.PeriodStart ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
            RangeEnd = timeseries.LastOrDefault()?.PeriodStart ?? DateTime.UtcNow.ToString("yyyy-MM-dd"),
        }, timeseries);
    }

    public async Task<List<PayoutRequest>> ListPayoutRequestsAsync(string userId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<PayoutRequest>(PayoutRequestsTable, userId) : [];
        return MergeByKey(_memory.PayoutRequests.Where(entry => entry.OwnerId == userId), stored, entry => entry.Id)
            .OrderByDescending(entry => entry.RequestedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<PayoutRequest?> CreatePayoutRequestAsync(string userId, int amountMinor, string note, string gateway)
    {
        var earnings = await GetAccountEarningsAsync(userId);
        if (amountMinor > earnings.Summary.AvailableForPayoutMinor)
        {
            return null;
        }

        var payoutPlugin = (await ListPluginsAsync()).FirstOrDefault(entry => entry.Id == "paypal-payouts");
        if (gateway == "paypalPayout" && (payoutPlugin is null || !payoutPlugin.Enabled || !payoutPlugin.PayoutGateway.AllowedGateways.Contains("paypalPayout", StringComparer.Ordinal)))
        {
            return null;
        }

        var payout = new PayoutRequest
        {
            Id = CreateId("payout"),
            OwnerId = userId,
            AmountMinor = amountMinor,
            Currency = earnings.Summary.Currency,
            Status = "pending",
            Gateway = gateway,
            GatewayReference = gateway == "paypalPayout" && configuration.PaypalPayoutConfigured ? $"paypal-payout-{CreateId("ref")}" : null,
            Note = note.Trim(),
            RequestedAt = UtcNow(),
        };
        if (tables.Enabled)
        {
            await tables.UpsertAsync(PayoutRequestsTable, userId, payout.Id, payout);
            if (gateway == "paypalPayout")
            {
                await RecordPluginUsageAsync("paypal-payouts", userId, "payout.requested");
                await RecordMonitoringEventAsync("payout", "payout.requested", "success", $"Created payout {payout.Id} via {gateway}.");
            }
            return payout;
        }

        _memory.PayoutRequests.Insert(0, payout);
        if (gateway == "paypalPayout")
        {
            await RecordPluginUsageAsync("paypal-payouts", userId, "payout.requested");
            await RecordMonitoringEventAsync("payout", "payout.requested", "success", $"Created payout {payout.Id} via {gateway}.");
        }
        return Clone(payout);
    }

    public async Task<VerificationReadiness> GetVerificationReadinessAsync(UserProfile user)
    {
        var profile = await GetOrCreateAccountProfileAsync(user);
        var settings = await GetOrCreateAccountSettingsAsync(user.Id);
        var media = (await ListAllMediaItemsAsync(user.Id)).Where(item => string.IsNullOrWhiteSpace(item.DeletedAt)).ToList();
        var existing = tables.Enabled ? await tables.GetAsync<VerificationReadiness>(VerificationTable, user.Id, "readiness") : _memory.VerificationReadiness.GetValueOrDefault(user.Id);
        var computed = BuildVerification(user.Id, profile, settings, media, existing);
        if (tables.Enabled)
        {
            await tables.UpsertAsync(VerificationTable, user.Id, "readiness", computed);
            return computed;
        }

        _memory.VerificationReadiness[user.Id] = computed;
        return Clone(computed);
    }

    public AccountSessionView ToAccountSessionView(SessionRecord session, string currentSessionId)
        => new()
        {
            Id = session.Id,
            UserId = session.UserId,
            DeviceLabel = string.IsNullOrWhiteSpace(session.DeviceLabel) ? "Unknown device" : session.DeviceLabel,
            UserAgent = string.IsNullOrWhiteSpace(session.UserAgent) ? "unknown" : session.UserAgent,
            CreatedAt = session.CreatedAt,
            LastSeenAt = session.LastSeenAt,
            ExpiresAt = session.ExpiresAt,
            RevokedAt = session.RevokedAt,
            Current = session.Id == currentSessionId,
        };

    public async Task<PreviewEnrollment?> GetPreviewEnrollmentAsync(string userId, string moduleId)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<PreviewEnrollment>(PreviewEnrollmentsTable, userId, moduleId);
            if (stored is not null) return stored;
        }

        return _memory.PreviewEnrollments.TryGetValue((userId, moduleId), out var enrollment) ? Clone(enrollment) : null;
    }

    public async Task<List<PreviewEnrollment>> ListPreviewEnrollmentsAsync(string userId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<PreviewEnrollment>(PreviewEnrollmentsTable, userId) : [];
        return MergeByKey(_memory.PreviewEnrollments.Values.Where(entry => entry.UserId == userId), stored, entry => entry.ModuleId).Select(Clone).ToList();
    }

    public async Task<PreviewEnrollment> SavePreviewEnrollmentAsync(string userId, string moduleId)
    {
        var enrollment = new PreviewEnrollment
        {
            UserId = userId,
            ModuleId = moduleId,
            Channel = "preview",
            EnrolledAt = UtcNow(),
        };
        if (tables.Enabled)
        {
            await tables.UpsertAsync(PreviewEnrollmentsTable, userId, moduleId, enrollment);
            return enrollment;
        }

        _memory.PreviewEnrollments[(userId, moduleId)] = enrollment;
        return Clone(enrollment);
    }

    private async Task<UserProfile?> GetUserByIdAsync(string userId)
        => (await ListUsersAsync()).FirstOrDefault(entry => entry.Id == userId);

    private async Task<MediaCollection?> GetCollectionAsync(string ownerId, string collectionId)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<MediaCollection>(MediaCollectionsTable, ownerId, collectionId);
            if (stored is not null) return stored;
        }
        return _memory.MediaCollections.TryGetValue(collectionId, out var collection) ? Clone(collection) : null;
    }

    private async Task<MediaItem?> GetMediaItemAsync(string ownerId, string mediaItemId)
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<MediaItem>(MediaItemsTable, ownerId, mediaItemId);
            if (stored is not null) return stored;
        }
        return _memory.MediaItems.TryGetValue(mediaItemId, out var item) ? Clone(item) : null;
    }

    private async Task<List<MediaItem>> ListAllMediaItemsAsync(string ownerId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<MediaItem>(MediaItemsTable, ownerId) : [];
        return MergeByKey(_memory.MediaItems.Values.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id).Select(Clone).ToList();
    }

    private async Task<UploadStatusEvent> AppendUploadEventAsync(string ownerId, string mediaItemId, string status, string message)
    {
        var evt = new UploadStatusEvent
        {
            Id = CreateId("upload-event"),
            OwnerId = ownerId,
            MediaItemId = mediaItemId,
            Status = status,
            Message = message,
            CreatedAt = UtcNow(),
        };
        if (tables.Enabled)
        {
            await tables.UpsertAsync(UploadEventsTable, ownerId, evt.Id, evt);
            return evt;
        }

        _memory.UploadEvents.Insert(0, evt);
        return Clone(evt);
    }

    private static UserAccountProfile DefaultProfile(UserProfile user)
    {
        var now = UtcNow();
        return new UserAccountProfile
        {
            UserId = user.Id,
            DisplayName = user.DisplayName,
            Bio = string.Empty,
            AvatarUrl = string.Empty,
            Preferences = new AccountPreferences { ContentTags = [], CollaborationInterests = [], Languages = ["en"] },
            Privacy = new AccountPrivacy { ProfileVisibility = "followers", Discoverable = true, ShowActivity = false, AllowDirectMessages = true },
            Contact = new AccountContact { SupportEmail = user.Email, EmailOptIn = true, MarketingOptIn = false },
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private static AccountSettings DefaultSettings(string userId)
    {
        var now = UtcNow();
        return new AccountSettings
        {
            UserId = userId,
            Notifications = new NotificationSettings { Email = true, Push = true, Product = true, Payouts = true, Security = true },
            DeviceSync = new DeviceSyncSettings { Enabled = true, CanonicalUpdatedAt = now, SessionCount = 0 },
            PayoutPreferences = new PayoutPreferences { SettlementCurrency = "GBP", Schedule = "manual", MethodStatus = "not-configured" },
            PurchasePreferences = new PurchasePreferenceSettings { AgeVerifiedAdult = false, LabelAsEntertainment = true, EntertainmentLabelValue = "Entertainment content" },
            PublishPreferences = new PublishPreferenceSettings { AutoPublishEnabled = true, DesiredPlatforms = ["instagram"] },
            CloseAccount = new CloseAccountState { Status = "active" },
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private static VerificationReadiness BuildVerification(string userId, UserAccountProfile profile, AccountSettings settings, List<MediaItem> mediaItems, VerificationReadiness? existing)
    {
        var hasProfile = !string.IsNullOrWhiteSpace(profile.DisplayName) && !string.IsNullOrWhiteSpace(profile.Contact.SupportEmail);
        var consentReady = mediaItems.Any(item => item.Consent.AllAdultsConfirmed && item.Consent.RightsConfirmed);
        var payoutReady = settings.PayoutPreferences.MethodStatus == "ready";
        var identityStatus = existing?.IdentityStatus ?? "not-started";
        var steps = new List<VerificationStep>
        {
            new() { Code = "profile-complete", Title = "Profile and contact controls complete", Status = hasProfile ? "complete" : "required" },
            new() { Code = "identity-check", Title = "Identity check submitted or verified", Status = identityStatus == "verified" ? "complete" : identityStatus == "pending" ? "pending" : "required" },
            new() { Code = "consent-documents", Title = "Consent documents attached to upload policy artifacts", Status = consentReady ? "complete" : "required" },
            new() { Code = "payout-details", Title = "Payout details placeholder marked ready", Status = payoutReady ? "complete" : settings.PayoutPreferences.MethodStatus == "pending" ? "pending" : "required" },
        };
        var status = steps.Any(step => step.Status == "required") ? "action-required" : steps.Any(step => step.Status == "pending") ? "pending-review" : "ready";
        return new VerificationReadiness
        {
            UserId = userId,
            Status = status,
            IdentityStatus = identityStatus,
            PayoutStatus = settings.PayoutPreferences.MethodStatus,
            ConsentStatus = consentReady ? "complete" : mediaItems.Count > 0 ? "partial" : "missing",
            RequiredSteps = steps.Where(step => step.Status != "complete").ToList(),
            UpdatedAt = UtcNow(),
        };
    }

    private static (int SoldCount, int EarnedMinor) GetCollectionTotals(MediaCollection collection, IEnumerable<MediaItem> items)
    {
        var activeItems = items.Where(item => item.CollectionId == collection.Id && item.OwnerId == collection.OwnerId && string.IsNullOrWhiteSpace(item.DeletedAt)).ToList();
        var published = activeItems.Where(item => item.PublishState == "published").ToList();
        return (collection.SoldCount + published.Sum(item => item.SoldCount), collection.EarnedMinor + published.Sum(item => item.EarnedMinor));
    }

    private static string BuildPolicyMarkdown(string ownerDisplayName, MediaCollection collection, MediaUploadIntakeInput input, string capturedByUserId)
        => $"# Upload policy artifact\n\n- Account: {ownerDisplayName}\n- Account ID: {capturedByUserId}\n- Collection: {collection.Title}\n- Folder: {input.Policy.FolderName}\n- Document: {input.Policy.DocumentName}\n- File name: {input.FileName}\n- Media type: {input.MediaType}\n- Publish state: {input.PublishState}\n- Price minor: {input.PriceMinor}\n- Currency: {input.Currency}\n- Performer count: {input.Consent.PerformerCount}\n- All adults confirmed: {(input.Consent.AllAdultsConfirmed ? "yes" : "no")}\n- Rights confirmed: {(input.Consent.RightsConfirmed ? "yes" : "no")}\n- Consent captured at: {input.Consent.ConsentCapturedAt}\n- Consent record years: {input.Consent.RecordRetentionYears}\n\n## Terms summary\n{input.Policy.TermsSummary}\n\n## Pricing summary\n{input.Policy.PricingSummary}\n\n## Consent notes\n{(string.IsNullOrWhiteSpace(input.Consent.Notes) ? "None provided." : input.Consent.Notes)}\n\n## Additional notes\n{(string.IsNullOrWhiteSpace(input.Policy.AdditionalNotes) ? "None provided." : input.Policy.AdditionalNotes)}\n";

    private void UpsertAlert(string userId, CollaborationAlert alert)
    {
        if (!_memory.CollaborationAlerts.TryGetValue(userId, out var alerts))
        {
            alerts = [];
            _memory.CollaborationAlerts[userId] = alerts;
        }
        alerts.Insert(0, alert);
    }

    private static double DistanceKm(double leftLatitude, double leftLongitude, double rightLatitude, double rightLongitude)
    {
        double ToRadians(double value) => value * Math.PI / 180;
        const double earthRadiusKm = 6371;
        var dLat = ToRadians(rightLatitude - leftLatitude);
        var dLon = ToRadians(rightLongitude - leftLongitude);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(ToRadians(leftLatitude)) * Math.Cos(ToRadians(rightLatitude)) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return earthRadiusKm * c;
    }

    private static int PredictedAffinity(CollaborationProfile viewer, CollaborationProfile candidate)
    {
        var sharedPreferences = viewer.Preferences.Intersect(candidate.Preferences).Count();
        var sharedTypes = viewer.CollaborationTypes.Intersect(candidate.CollaborationTypes).Count();
        var bonus = candidate.PromotedHighlight ? 10 : 0;
        return Math.Min(100, sharedPreferences * 20 + sharedTypes * 15 + bonus + (candidate.AvailableNow ? 10 : 0));
    }

    private static T Clone<T>(T instance) => JsonSerializer.Deserialize<T>(JsonSerializer.Serialize(instance))!;

    private static List<T> MergeByKey<T>(IEnumerable<T> seed, IEnumerable<T> stored, Func<T, string> keySelector)
    {
        var map = new Dictionary<string, T>(StringComparer.OrdinalIgnoreCase);
        foreach (var item in seed)
        {
            map[keySelector(item)] = Clone(item);
        }
        foreach (var item in stored)
        {
            map[keySelector(item)] = Clone(item);
        }
        return map.Values.ToList();
    }

    private static SeedData BuildSeed()
    {
        var adminUser = new UserProfile { Id = "user-admin", Email = "admin@example.com", Role = "platformAdmin", AccountTier = "studio", DisplayName = "Platform Admin", CreatedAt = DaysAgo(400) };
        var annaUser = new UserProfile { Id = "user-creator-anna", Email = "anna@example.com", Role = "creator", AccountTier = "pro", DisplayName = "Anna", CreatedAt = DaysAgo(120) };
        var lucaUser = new UserProfile { Id = "user-creator-luca", Email = "luca@example.com", Role = "creator", AccountTier = "starter", DisplayName = "Luca", CreatedAt = DaysAgo(14) };

        var annaProfile = new UserAccountProfile
        {
            UserId = annaUser.Id,
            DisplayName = annaUser.DisplayName,
            Bio = "Creator account ready for moderated publishing and compliant monetization setup.",
            AvatarUrl = "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
            Preferences = new AccountPreferences { ContentTags = ["fitness", "editorial", "glamour"], CollaborationInterests = ["photo", "video"], Languages = ["en", "it"] },
            Privacy = new AccountPrivacy { ProfileVisibility = "followers", Discoverable = true, ShowActivity = true, AllowDirectMessages = true },
            Contact = new AccountContact { SupportEmail = annaUser.Email, EmailOptIn = true, MarketingOptIn = true },
            CreatedAt = DaysAgo(120),
            UpdatedAt = DaysAgo(2),
        };
        var lucaProfile = new UserAccountProfile
        {
            UserId = lucaUser.Id,
            DisplayName = lucaUser.DisplayName,
            Bio = "Account with staged identity checks and draft collections for moderated launch planning.",
            AvatarUrl = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
            Preferences = new AccountPreferences { ContentTags = ["lifestyle", "promo"], CollaborationInterests = ["bundle"], Languages = ["en"] },
            Privacy = new AccountPrivacy { ProfileVisibility = "private", Discoverable = false, ShowActivity = false, AllowDirectMessages = false },
            Contact = new AccountContact { SupportEmail = lucaUser.Email, EmailOptIn = true, MarketingOptIn = false },
            CreatedAt = DaysAgo(14),
            UpdatedAt = DaysAgo(1),
        };

        var annaSettings = DefaultSettings(annaUser.Id);
        annaSettings.PayoutPreferences = new PayoutPreferences { SettlementCurrency = "GBP", Schedule = "weekly", MethodStatus = "ready" };
        annaSettings.DeviceSync = new DeviceSyncSettings { Enabled = true, CanonicalUpdatedAt = DaysAgo(1), SessionCount = 1 };
        annaSettings.UpdatedAt = DaysAgo(1);
        var lucaSettings = DefaultSettings(lucaUser.Id);
        lucaSettings.DeviceSync = new DeviceSyncSettings { Enabled = true, CanonicalUpdatedAt = DaysAgo(1), LastSyncedSessionId = "session-luca-tablet", SessionCount = 1 };
        lucaSettings.PayoutPreferences = new PayoutPreferences { SettlementCurrency = "GBP", Schedule = "manual", MethodStatus = "pending" };
        lucaSettings.CloseAccount = new CloseAccountState { Status = "requested", RequestedAt = DaysAgo(1), RequestedBySessionId = "session-luca-tablet", Reason = "Reducing account activity while identity review is pending.", RetentionAcknowledged = true, AccessLossAcknowledged = true };
        lucaSettings.UpdatedAt = DaysAgo(1);

        var annaCollection = new MediaCollection { Id = "collection-anna-editorial", OwnerId = annaUser.Id, FolderName = "anna-editorial-drop", Title = "Editorial Drop", Description = "Published image bundle with staged moderation and sales history.", Visibility = "followers", PublishState = "published", PriceMinor = 1800, Currency = "GBP", SoldCount = 9, EarnedMinor = 16200, Status = "active", CreatedAt = DaysAgo(90), UpdatedAt = DaysAgo(2) };
        var lucaCollection = new MediaCollection { Id = "collection-luca-drafts", OwnerId = lucaUser.Id, FolderName = "luca-launch-drafts", Title = "Launch Drafts", Description = "Processing-ready content waiting on payout and identity readiness.", Visibility = "private", PublishState = "draft", PriceMinor = 0, Currency = "GBP", SoldCount = 0, EarnedMinor = 0, Status = "active", CreatedAt = DaysAgo(10), UpdatedAt = DaysAgo(1) };
        var annaPolicy = new PolicyArtifactRecord { Id = "policy-anna-editorial", OwnerId = annaUser.Id, FolderName = annaCollection.FolderName, DocumentName = "editorial-consent", FileName = $"{annaCollection.FolderName}-editorial-consent.md", Uri = $"memory://policies/{annaCollection.FolderName}-editorial-consent.md", CreatedAt = DaysAgo(80) };
        var lucaPolicy = new PolicyArtifactRecord { Id = "policy-luca-launch", OwnerId = lucaUser.Id, FolderName = lucaCollection.FolderName, DocumentName = "launch-checklist", FileName = $"{lucaCollection.FolderName}-launch-checklist.md", Uri = $"memory://policies/{lucaCollection.FolderName}-launch-checklist.md", CreatedAt = DaysAgo(10) };
        var annaMediaReady = new MediaItem { Id = "media-anna-ready-1", OwnerId = annaUser.Id, CollectionId = annaCollection.Id, FolderName = annaCollection.FolderName, Title = "Editorial Cover Set", Description = "Approved image set ready for storefront rendering.", FileName = "editorial-cover.jpg", ContentType = "image/jpeg", MediaType = "image", UploadStatus = "ready", PublishState = "published", PriceMinor = 900, Currency = "GBP", SoldCount = 11, EarnedMinor = 9900, BlobUrl = "memory://media/editorial-cover.jpg", UploadMode = "memory", BackgroundStreamId = "stream-media-anna-ready-1", BackgroundUpdatedAt = DaysAgo(2), Consent = new ConsentMetadata { PerformerCount = 1, AllAdultsConfirmed = true, RightsConfirmed = true, ConsentCapturedAt = DaysAgo(30), ConsentDocumentName = "editorial-consent", RecordRetentionYears = 7, Notes = "Creator self-owned release attached." }, PolicyArtifact = annaPolicy, CreatedAt = DaysAgo(70), UpdatedAt = DaysAgo(2) };
        var annaMediaProcessing = new MediaItem { Id = "media-anna-processing-1", OwnerId = annaUser.Id, CollectionId = annaCollection.Id, FolderName = annaCollection.FolderName, Title = "Behind The Scenes Reel", Description = "Video upload currently in moderated processing.", FileName = "behind-scenes.mp4", ContentType = "video/mp4", MediaType = "video", UploadStatus = "processing", PublishState = "draft", PriceMinor = 1200, Currency = "GBP", SoldCount = 0, EarnedMinor = 0, BlobUrl = "memory://media/behind-scenes.mp4", UploadMode = "memory", BackgroundStreamId = "stream-media-anna-processing-1", BackgroundUpdatedAt = DaysAgo(1), Consent = new ConsentMetadata { PerformerCount = 1, AllAdultsConfirmed = true, RightsConfirmed = true, ConsentCapturedAt = DaysAgo(14), ConsentDocumentName = "editorial-consent", RecordRetentionYears = 7, Notes = "Pending transcoding checks." }, PolicyArtifact = annaPolicy, CreatedAt = DaysAgo(20), UpdatedAt = DaysAgo(1) };
        var lucaMediaPending = new MediaItem { Id = "media-luca-pending-1", OwnerId = lucaUser.Id, CollectionId = lucaCollection.Id, FolderName = lucaCollection.FolderName, Title = "Launch Preview Bundle", Description = "Pending upload intake awaiting moderation handoff.", FileName = "launch-preview.jpg", ContentType = "image/jpeg", MediaType = "image", UploadStatus = "pending", PublishState = "draft", PriceMinor = 700, Currency = "GBP", SoldCount = 0, EarnedMinor = 0, BlobUrl = "memory://media/launch-preview.jpg", UploadMode = "memory", BackgroundStreamId = "stream-media-luca-pending-1", BackgroundUpdatedAt = DaysAgo(1), Consent = new ConsentMetadata { PerformerCount = 1, AllAdultsConfirmed = true, RightsConfirmed = true, ConsentCapturedAt = DaysAgo(4), ConsentDocumentName = "launch-checklist", RecordRetentionYears = 7, Notes = "Awaiting identity check completion before publishing." }, PolicyArtifact = lucaPolicy, CreatedAt = DaysAgo(5), UpdatedAt = DaysAgo(1) };

        var seed = new SeedData
        {
            Users = new Dictionary<string, UserProfile> { [adminUser.Id] = adminUser, [annaUser.Id] = annaUser, [lucaUser.Id] = lucaUser },
            UsersByEmail = new Dictionary<string, UserProfile> { [NormalizeKey(adminUser.Email)] = adminUser, [NormalizeKey(annaUser.Email)] = annaUser, [NormalizeKey(lucaUser.Email)] = lucaUser },
            Sessions = new Dictionary<string, SessionRecord>
            {
                ["token-anna-browser"] = new SessionRecord { Id = "session-anna-browser", Token = "token-anna-browser", UserId = annaUser.Id, Email = annaUser.Email, Role = annaUser.Role, CreatedAt = DaysAgo(3), LastSeenAt = DaysAgo(1), ExpiresAt = DaysAhead(5), DeviceLabel = "Anna Chrome", UserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X)" },
                ["token-luca-tablet"] = new SessionRecord { Id = "session-luca-tablet", Token = "token-luca-tablet", UserId = lucaUser.Id, Email = lucaUser.Email, Role = lucaUser.Role, CreatedAt = DaysAgo(2), LastSeenAt = DaysAgo(1), ExpiresAt = DaysAhead(4), DeviceLabel = "Luca iPad", UserAgent = "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)" },
            },
            Challenges = new Dictionary<string, List<AuthChallenge>>(),
            Onboarding = new Dictionary<string, OnboardingRecord>(),
            Items = new Dictionary<string, CatalogItem>
            {
                ["item-starter-template"] = new CatalogItem { Id = "item-starter-template", OwnerId = adminUser.Id, Title = "Community Starter Template", Description = "A digital starter offer with commission-ready marketplace support.", PriceMinor = 2900, Currency = "GBP", Type = "digital", CreatedAt = DaysAgo(50) },
                ["item-review-pack"] = new CatalogItem { Id = "item-review-pack", OwnerId = adminUser.Id, Title = "Launch Review Pack", Description = "A request-based service slot for account reviews, workflow setup, and launch guidance.", PriceMinor = 7900, Currency = "GBP", Type = "service-request", CreatedAt = DaysAgo(20) },
            },
            AuditLog = [new AuditEvent { Id = "audit-bootstrap", ActorId = adminUser.Id, Action = "system.bootstrap", TargetType = "platform", TargetId = "starter", CreatedAt = DaysAgo(120), Details = "Initialized starter platform state." }],
            ModerationCases = [new ModerationCase { Id = "case-media-review", WorkspaceName = "Launch Cohort", Reason = "Manual review required for first upload.", Status = "open", CreatedAt = DaysAgo(1) }, new ModerationCase { Id = "case-policy-ack", WorkspaceName = "Community Sellers", Reason = "Marketplace policy acknowledgement missing for one draft item.", Status = "open", CreatedAt = DaysAgo(2) }],
            Subscriptions = [new SubscriptionSummary { Id = "sub-admin-pro", OwnerEmail = adminUser.Email, Plan = "pro", Status = "active", RenewalDate = DaysAhead(14) }, new SubscriptionSummary { Id = "sub-creator-free", OwnerEmail = "creator@example.com", Plan = "free", Status = "trial", RenewalDate = DaysAhead(7) }],
            EarningsReport = [new EarningsReportRow { Month = "2026-03", GrossMinor = 126500, NetMinor = 111320, FeesMinor = 15180, Currency = "GBP" }, new EarningsReportRow { Month = "2026-04", GrossMinor = 186400, NetMinor = 164032, FeesMinor = 22368, Currency = "GBP" }],
            Leads = [new LeadRecord { Id = "lead-telegram-starter", DisplayName = "Creator cohort lead", Channel = "telegram", Source = "community", Stage = "qualified", AiScore = 82, Notes = "Opt-in community lead with strong first-week activation signals." }, new LeadRecord { Id = "lead-whatsapp-referral", DisplayName = "Referral invite chain", Channel = "whatsapp", Source = "referral", Stage = "invited", AiScore = 77, Notes = "Came through an existing creator referral, ready for manual outreach." }],
            QualificationRules = [new QualificationRule { Id = "policy-bundle", Title = "Terms, privacy, and marketplace policy accepted", Status = "required" }, new QualificationRule { Id = "adult-declaration", Title = "Adult-only declaration recorded for the account", Status = "required" }, new QualificationRule { Id = "profile-complete", Title = "Display name, workspace, and region completed", Status = "required" }, new QualificationRule { Id = "first-party-rights", Title = "Ownership / rights declaration attached to the upload", Status = "required" }, new QualificationRule { Id = "manual-review", Title = "Flag unusual uploads for manual moderation before publishing", Status = "recommended" }],
            CollaborationProfiles = new Dictionary<string, CollaborationProfile>
            {
                [annaUser.Id] = new CollaborationProfile { UserId = annaUser.Id, DisplayName = annaUser.DisplayName, AvatarUrl = annaProfile.AvatarUrl, Bio = "Available for creator shoots with an upbeat style and quick collaboration turnaround.", City = "Bristol", CountryCode = "GB", Latitude = 51.4545, Longitude = -2.5879, LocationDisclosureAccepted = true, PromotedHighlight = true, PromotedDisclosureAccepted = true, NotifyOnNearby = true, AvailableNow = true, ContactHandle = "@anna-collabs", Preferences = ["editorial", "fitness", "glamour"], CollaborationTypes = ["photo", "video"], CreatedAt = DaysAgo(60), UpdatedAt = DaysAgo(1) },
                [lucaUser.Id] = new CollaborationProfile { UserId = lucaUser.Id, DisplayName = lucaUser.DisplayName, AvatarUrl = lucaProfile.AvatarUrl, Bio = "Interested in short-form collaborative sets and promo bundles with clear planning.", City = "Bath", CountryCode = "GB", Latitude = 51.3813, Longitude = -2.3590, LocationDisclosureAccepted = true, PromotedHighlight = false, PromotedDisclosureAccepted = false, NotifyOnNearby = true, AvailableNow = true, ContactHandle = "@luca-content", Preferences = ["lifestyle", "duo", "promo"], CollaborationTypes = ["photo", "bundle"], CreatedAt = DaysAgo(14), UpdatedAt = DaysAgo(1) },
            },
            CollaborationRequests = new Dictionary<string, CollaborationRequest>(),
            CollaborationAlerts = new Dictionary<string, List<CollaborationAlert>>(),
            AffiliateCampaigns = [new AffiliateCampaign { Id = "affiliate-anna", OwnerUserId = annaUser.Id, OwnerDisplayName = annaUser.DisplayName, ShareCode = "anna-earns", CtaCopy = "Start earning with me", RewardPercent = 10, CapSalesCount = 5, CapDays = 21, ActiveReferrals = 3, RewardMinorPaid = 3800, Currency = "GBP", CreatedAt = DaysAgo(40) }, new AffiliateCampaign { Id = "affiliate-luca", OwnerUserId = lucaUser.Id, OwnerDisplayName = lucaUser.DisplayName, ShareCode = "luca-launch", CtaCopy = "Click here to start earning", RewardPercent = 12, CapSalesCount = 7, CapDays = 30, ActiveReferrals = 2, RewardMinorPaid = 2700, Currency = "GBP", CreatedAt = DaysAgo(10) }],
            MemberRequests = [new MemberRequest { Id = "request-brief-001", RequesterUserId = lucaUser.Id, RequesterDisplayName = lucaUser.DisplayName, TargetUserId = annaUser.Id, TargetDisplayName = annaUser.DisplayName, Title = "Fitness duo teaser", Details = "Need a quick two-person teaser bundle this week with clear delivery timing.", Type = "video-bundle", Status = "accepted", PromisedByUserId = annaUser.Id, CreatedAt = DaysAgo(3), PromisedAt = DaysAgo(2) }, new MemberRequest { Id = "request-brief-002", RequesterUserId = annaUser.Id, RequesterDisplayName = annaUser.DisplayName, TargetUserId = lucaUser.Id, TargetDisplayName = lucaUser.DisplayName, Title = "Joint photo set", Details = "Looking for a same-day collaboration set with shared promotion.", Type = "content-collab", Status = "open", CreatedAt = DaysAgo(1) }],
            StudioSessions = [new StudioSession { Id = "studio-session-001", Title = "Rooftop Session - May 2026", InitiatorUserId = annaUser.Id, CreatorAUserId = annaUser.Id, CreatorADisplayName = annaUser.DisplayName, CreatorBUserId = lucaUser.Id, CreatorBDisplayName = lucaUser.DisplayName, ContentType = "video", SessionMode = "upload-bundle", Status = "payout_initiated", GrossMinor = 24800, FeesMinor = 2976, NetMinor = 21824, CreatorAShareMinor = 13094, CreatorBShareMinor = 8730, CreatorASharePercent = 60, CreatorBSharePercent = 40, PartnerConfirmed = true, CreatedAt = DaysAgo(12) }, new StudioSession { Id = "studio-session-002", Title = "Live Duo Session", InitiatorUserId = lucaUser.Id, CreatorAUserId = lucaUser.Id, CreatorADisplayName = lucaUser.DisplayName, CreatorBUserId = annaUser.Id, CreatorBDisplayName = annaUser.DisplayName, ContentType = "stream", SessionMode = "remote-stream", Status = "pending_partner_confirm", GrossMinor = 11250, FeesMinor = 1350, NetMinor = 9900, CreatorAShareMinor = 5940, CreatorBShareMinor = 3960, CreatorASharePercent = 60, CreatorBSharePercent = 40, PartnerConfirmed = false, CreatedAt = DaysAgo(1) }],
            StudioTimeline = [new StudioTimelineEntry { Id = "timeline-001", SessionId = "studio-session-001", Timestamp = DaysAgo(12), ActorDisplayName = annaUser.DisplayName, EventType = "split.initiated", Description = "Initiator created the fixed 60/40 split." }, new StudioTimelineEntry { Id = "timeline-002", SessionId = "studio-session-001", Timestamp = DaysAgo(11), ActorDisplayName = lucaUser.DisplayName, EventType = "split.confirmed", Description = "Partner agreed to the split arrangement." }, new StudioTimelineEntry { Id = "timeline-003", SessionId = "studio-session-001", Timestamp = DaysAgo(10), ActorDisplayName = "system", EventType = "payout.initiated", Description = "Settlement initiated for both creators." }],
            PlatformRequests = [new PlatformRequest { Id = "platform-request-telegram-bot", UserId = annaUser.Id, PlatformName = "Telegram bot onboarding", Type = "messaging", Note = "Help smaller creators onboard and receive alerts through Telegram.", RequestedByDisplayName = annaUser.DisplayName, Status = "reviewing", Votes = 14, CreatedAt = DaysAgo(7) }, new PlatformRequest { Id = "platform-request-reddit-publishing", UserId = lucaUser.Id, PlatformName = "Reddit publishing support", Type = "publishing", Note = "Allow community-driven teaser posting and attribution back to creator offers.", RequestedByDisplayName = lucaUser.DisplayName, Status = "new", Votes = 9, CreatedAt = DaysAgo(2) }],
            AccountProfiles = new Dictionary<string, UserAccountProfile> { [annaUser.Id] = annaProfile, [lucaUser.Id] = lucaProfile },
            AccountSettings = new Dictionary<string, AccountSettings> { [annaUser.Id] = annaSettings, [lucaUser.Id] = lucaSettings },
            MediaCollections = new Dictionary<string, MediaCollection> { [annaCollection.Id] = annaCollection, [lucaCollection.Id] = lucaCollection },
            MediaItems = new Dictionary<string, MediaItem> { [annaMediaReady.Id] = annaMediaReady, [annaMediaProcessing.Id] = annaMediaProcessing, [lucaMediaPending.Id] = lucaMediaPending },
            UploadEvents = [new UploadStatusEvent { Id = "upload-event-anna-1", OwnerId = annaUser.Id, MediaItemId = annaMediaReady.Id, Status = "ready", Message = "Upload passed moderation checks and is ready.", CreatedAt = DaysAgo(2) }, new UploadStatusEvent { Id = "upload-event-anna-2", OwnerId = annaUser.Id, MediaItemId = annaMediaProcessing.Id, Status = "processing", Message = "Upload is being processed for streaming renditions.", CreatedAt = DaysAgo(1) }, new UploadStatusEvent { Id = "upload-event-luca-1", OwnerId = lucaUser.Id, MediaItemId = lucaMediaPending.Id, Status = "pending", Message = "Upload intake created and waiting for transfer completion.", CreatedAt = DaysAgo(1) }],
            PayoutRequests = [new PayoutRequest { Id = "payout-anna-paid", OwnerId = annaUser.Id, AmountMinor = 12500, Currency = "GBP", Status = "paid", Note = "Weekly settlement", RequestedAt = DaysAgo(14), ProcessedAt = DaysAgo(13) }, new PayoutRequest { Id = "payout-anna-processing", OwnerId = annaUser.Id, AmountMinor = 6400, Currency = "GBP", Status = "processing", Note = "Manual payout review", RequestedAt = DaysAgo(3) }, new PayoutRequest { Id = "payout-luca-pending", OwnerId = lucaUser.Id, AmountMinor = 3100, Currency = "GBP", Status = "pending", Note = "Awaiting payout details readiness", RequestedAt = DaysAgo(1) }],
            VerificationReadiness = new Dictionary<string, VerificationReadiness> { [annaUser.Id] = new VerificationReadiness { UserId = annaUser.Id, Status = "ready", IdentityStatus = "verified", PayoutStatus = "ready", ConsentStatus = "complete", RequiredSteps = [], UpdatedAt = DaysAgo(1) }, [lucaUser.Id] = new VerificationReadiness { UserId = lucaUser.Id, Status = "pending-review", IdentityStatus = "pending", PayoutStatus = "pending", ConsentStatus = "partial", RequiredSteps = [new VerificationStep { Code = "identity-check", Title = "Identity check submitted", Status = "pending" }, new VerificationStep { Code = "payout-details", Title = "Payout details ready", Status = "pending" }], UpdatedAt = DaysAgo(1) } },
            EarningsLedger = [new EarningsLedgerEntry { Id = "earn-anna-2026-03", OwnerId = annaUser.Id, PeriodStart = "2026-03-01", GrossMinor = 19800, NetMinor = 17424, FeesMinor = 2376, SoldCount = 22, Currency = "GBP" }, new EarningsLedgerEntry { Id = "earn-anna-2026-04", OwnerId = annaUser.Id, PeriodStart = "2026-04-01", GrossMinor = 28400, NetMinor = 24992, FeesMinor = 3408, SoldCount = 31, Currency = "GBP" }, new EarningsLedgerEntry { Id = "earn-luca-2026-04", OwnerId = lucaUser.Id, PeriodStart = "2026-04-01", GrossMinor = 6200, NetMinor = 5456, FeesMinor = 744, SoldCount = 8, Currency = "GBP" }],
            PreviewEnrollments = new Dictionary<(string UserId, string ModuleId), PreviewEnrollment>(),
        };
        ExtendSeed(seed);
        return seed;
    }

    static partial void ExtendSeed(SeedData seed);

    private sealed partial class SeedData
    {
        public Dictionary<string, UserProfile> Users { get; init; } = [];
        public Dictionary<string, UserProfile> UsersByEmail { get; init; } = [];
        public Dictionary<string, SessionRecord> Sessions { get; init; } = [];
        public Dictionary<string, List<AuthChallenge>> Challenges { get; init; } = [];
        public Dictionary<string, OnboardingRecord> Onboarding { get; init; } = [];
        public Dictionary<string, CatalogItem> Items { get; init; } = [];
        public List<AuditEvent> AuditLog { get; init; } = [];
        public List<ModerationCase> ModerationCases { get; init; } = [];
        public List<SubscriptionSummary> Subscriptions { get; init; } = [];
        public List<EarningsReportRow> EarningsReport { get; init; } = [];
        public List<LeadRecord> Leads { get; init; } = [];
        public List<QualificationRule> QualificationRules { get; init; } = [];
        public Dictionary<string, CollaborationProfile> CollaborationProfiles { get; init; } = [];
        public Dictionary<string, CollaborationRequest> CollaborationRequests { get; init; } = [];
        public Dictionary<string, List<CollaborationAlert>> CollaborationAlerts { get; init; } = [];
        public List<AffiliateCampaign> AffiliateCampaigns { get; init; } = [];
        public List<MemberRequest> MemberRequests { get; init; } = [];
        public List<StudioSession> StudioSessions { get; init; } = [];
        public List<StudioTimelineEntry> StudioTimeline { get; init; } = [];
        public List<PlatformRequest> PlatformRequests { get; init; } = [];
        public Dictionary<string, UserAccountProfile> AccountProfiles { get; init; } = [];
        public Dictionary<string, AccountSettings> AccountSettings { get; init; } = [];
        public Dictionary<string, MediaCollection> MediaCollections { get; init; } = [];
        public Dictionary<string, MediaItem> MediaItems { get; init; } = [];
        public List<UploadStatusEvent> UploadEvents { get; init; } = [];
        public List<PayoutRequest> PayoutRequests { get; init; } = [];
        public Dictionary<string, VerificationReadiness> VerificationReadiness { get; init; } = [];
        public List<EarningsLedgerEntry> EarningsLedger { get; init; } = [];
        public Dictionary<(string UserId, string ModuleId), PreviewEnrollment> PreviewEnrollments { get; init; } = [];
    }

    private sealed class EarningsLedgerEntry
    {
        public string Id { get; init; } = string.Empty;
        public string OwnerId { get; init; } = string.Empty;
        public string PeriodStart { get; init; } = string.Empty;
        public int GrossMinor { get; init; }
        public int NetMinor { get; init; }
        public int FeesMinor { get; init; }
        public int SoldCount { get; init; }
        public string Currency { get; init; } = "GBP";
    }
}
