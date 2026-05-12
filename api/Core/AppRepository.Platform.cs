using System.Security.Cryptography;
using System.Text.Json;

namespace OnlyFling.Api.Core;

public sealed partial class AppRepository
{
    private const string WalletsTable = "wallets";
    private const string InvoicesTable = "invoices";
    private const string PurchasesTable = "purchases";
    private const string ConnectorsTable = "connectors";
    private const string ModulesTable = "modules";
    private const string PluginsTable = "plugins";
    private const string PluginUsageTable = "pluginusage";
    private const string ProcessingWorkTable = "processingwork";
    private const string UploadMetadataTable = "uploadmetadata";
    private const string MonitoringTable = "monitoring";
    private const string SeedOperationsTable = "seedoperations";
    private const string EarningsLedgerTable = "earningsledger";
    private const string PublishLogsTable = "publishlogs";

    public async Task<List<ConnectorDefinition>> ListConnectorDefinitionsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<ConnectorDefinition>(ConnectorsTable, "connector") : [];
        return MergeByKey(_memory.Connectors, stored, entry => entry.Id)
            .OrderBy(entry => entry.Name)
            .Select(Clone)
            .ToList();
    }

    public async Task<List<AppModule>> ListModuleDefinitionsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<AppModule>(ModulesTable, "module") : [];
        return MergeByKey(_memory.Modules, stored, entry => entry.Id)
            .OrderBy(entry => entry.Name)
            .Select(Clone)
            .ToList();
    }

    public async Task<List<PluginRuntimeState>> ListPluginsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<PluginRuntimeState>(PluginsTable, "plugin") : [];
        var plugins = MergeByKey(_memory.Plugins, stored, entry => entry.Id)
            .OrderBy(entry => entry.DisplayName)
            .ToList();

        var usage = await ListPluginUsageAsync();
        foreach (var plugin in plugins)
        {
            var scoped = usage.Where(entry => entry.PluginId == plugin.Id).OrderByDescending(entry => entry.CreatedAt).ToList();
            plugin.Usage = new PluginUsageSummary
            {
                UsageCount = scoped.Count,
                LastUsedAt = scoped.FirstOrDefault()?.CreatedAt,
            };
            plugin.ConfigurationHints["stripeConfigured"] = configuration.StripeConfigured.ToString().ToLowerInvariant();
            plugin.ConfigurationHints["paypalPayoutConfigured"] = configuration.PaypalPayoutConfigured.ToString().ToLowerInvariant();
        }

        return plugins.Select(Clone).ToList();
    }

    public async Task<List<PluginRuntimeState>> ListClientVisiblePluginsAsync(SessionRecord? session)
    {
        var plugins = (await ListPluginsAsync()).Where(entry => entry.ClientVisible && entry.Enabled).ToList();
        if (session is null)
        {
            return plugins.Select(Clone).ToList();
        }

        var user = await GetOrCreateUserAsync(session.Email);
        var readiness = await GetVerificationReadinessAsync(user);
        var accountAgeDays = Math.Max(0, (int)Math.Floor((DateTimeOffset.UtcNow - DateTimeOffset.Parse(user.CreatedAt)).TotalDays));
        foreach (var plugin in plugins)
        {
            plugin.ConfigurationHints["accountAgeDays"] = accountAgeDays.ToString();
            plugin.ConfigurationHints["identityStatus"] = readiness.IdentityStatus;
            plugin.ConfigurationHints["consentStatus"] = readiness.ConsentStatus;
        }

        return plugins;
    }

    public async Task<PluginRuntimeState?> UpdatePluginConfigAsync(string actorUserId, AdminPluginConfigInput input)
    {
        var plugin = (await ListPluginsAsync()).FirstOrDefault(entry => entry.Id == input.PluginId);
        if (plugin is null)
        {
            return null;
        }

        if (input.Enabled.HasValue)
        {
            plugin.Enabled = input.Enabled.Value;
        }
        if (input.PurchaseBehavior is not null)
        {
            plugin.PurchaseBehavior = input.PurchaseBehavior;
        }
        if (input.PayoutGateway is not null)
        {
            plugin.PayoutGateway = input.PayoutGateway;
        }

        await UpsertPluginAsync(plugin);
        await RecordPluginUsageAsync(plugin.Id, actorUserId, "admin.config.updated");
        await RecordMonitoringEventAsync("plugin", "plugin.config.updated", "success", $"Updated plugin {plugin.Id}.");
        return plugin;
    }

    public async Task<AccountWallet> GetOrCreateWalletAsync(string userId, string currency = "GBP")
    {
        if (tables.Enabled)
        {
            var stored = await tables.GetAsync<AccountWallet>(WalletsTable, userId, "wallet");
            if (stored is not null)
            {
                return stored;
            }
        }

        if (_memory.Wallets.TryGetValue(userId, out var existing))
        {
            return Clone(existing);
        }

        var wallet = new AccountWallet
        {
            UserId = userId,
            Currency = currency,
            UpdatedAt = UtcNow(),
        };
        await UpsertWalletAsync(wallet);
        return wallet;
    }

    public async Task<List<InvoiceRecord>> ListInvoicesAsync(string userId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<InvoiceRecord>(InvoicesTable, userId) : [];
        return MergeByKey(_memory.Invoices.Where(entry => entry.UserId == userId), stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<(MediaPurchaseRecord? Purchase, InvoiceRecord? Invoice, AccountWallet Wallet, PaymentSessionContract? PaymentSession, string? Error)> CreateMediaPurchaseAsync(SessionRecord buyerSession, MediaPurchaseInput input)
    {
        var buyerId = buyerSession.UserId;
        var mediaItem = await GetPurchasableMediaItemAsync(input.MediaItemId);
        var wallet = await GetOrCreateWalletAsync(buyerId);
        if (mediaItem is null)
        {
            return (null, null, wallet, null, "media-item-not-found");
        }
        if (mediaItem.OwnerId == buyerId)
        {
            return (null, null, wallet, null, "cannot-purchase-own-media");
        }

        var paymentPlugin = await GetRequiredPluginAsync("stripe");
        if (!paymentPlugin.Enabled)
        {
            return (null, null, wallet, null, "payments-disabled");
        }
        if (!paymentPlugin.PurchaseBehavior.AllowedPurchaseMethods.Contains(input.PaymentMethod, StringComparer.Ordinal))
        {
            return (null, null, wallet, null, "payment-method-not-allowed");
        }
        if (mediaItem.PriceMinor < paymentPlugin.PurchaseBehavior.MinimumPurchaseMinor || mediaItem.PriceMinor > paymentPlugin.PurchaseBehavior.MaximumPurchaseMinor)
        {
            return (null, null, wallet, null, "purchase-amount-out-of-range");
        }

        var settings = await GetOrCreateAccountSettingsAsync(buyerId);
        if (mediaItem.AgeRating == "adult" && paymentPlugin.PurchaseBehavior.RequireAgeVerificationForAdultContent && !settings.PurchasePreferences.AgeVerifiedAdult)
        {
            return (null, null, wallet, null, "adult-content-age-verification-required");
        }

        var now = UtcNow();
        var convenienceFeeMinor = 0;
        var platformCutMinor = (int)Math.Round(mediaItem.PriceMinor * configuration.PlatformTransactionCutRate, MidpointRounding.AwayFromZero);
        var invoice = new InvoiceRecord
        {
            Id = CreateId("invoice"),
            UserId = buyerId,
            MediaItemId = mediaItem.Id,
            Status = input.PaymentMethod == "credits" ? "paid" : "pending",
            Label = BuildInvoiceLabel(settings, paymentPlugin),
            TotalMinor = mediaItem.PriceMinor,
            Currency = mediaItem.Currency,
            CreatedAt = now,
            SettledAt = input.PaymentMethod == "credits" ? now : null,
            Lines =
            [
                new InvoiceLine
                {
                    Description = $"{mediaItem.MediaType} purchase: {mediaItem.Title}",
                    AmountMinor = mediaItem.PriceMinor,
                    Currency = mediaItem.Currency,
                },
            ],
        };

        var purchase = new MediaPurchaseRecord
        {
            Id = CreateId("purchase"),
            BuyerId = buyerId,
            SellerId = mediaItem.OwnerId,
            MediaItemId = mediaItem.Id,
            InvoiceId = invoice.Id,
            Status = input.PaymentMethod == "credits" ? "completed" : "pending",
            PaymentMethod = input.PaymentMethod,
            AdultContent = mediaItem.AgeRating == "adult",
            AmountMinor = mediaItem.PriceMinor,
            ConvenienceFeeMinor = convenienceFeeMinor,
            PlatformCutMinor = platformCutMinor,
            Currency = mediaItem.Currency,
            CreatedAt = now,
            CompletedAt = input.PaymentMethod == "credits" ? now : null,
        };
        invoice.PurchaseId = purchase.Id;

        PaymentSessionContract? paymentSession = null;
        if (input.PaymentMethod == "credits")
        {
            if (wallet.CreditsMinor < mediaItem.PriceMinor)
            {
                return (null, null, wallet, null, "insufficient-credits");
            }

            wallet.CreditsMinor -= mediaItem.PriceMinor;
            wallet.SpentMinor += mediaItem.PriceMinor;
            wallet.UpdatedAt = now;
            await UpsertWalletAsync(wallet);
            await ApplyCompletedPurchaseSideEffectsAsync(mediaItem, purchase, now);
            await RecordPluginUsageAsync(paymentPlugin.Id, buyerId, "purchase.completed");
            await RecordMonitoringEventAsync("purchase", "media.purchase.completed", "success", $"Completed purchase {purchase.Id} for {mediaItem.Id}.");
        }
        else
        {
            if (!configuration.StripeConfigured || !configuration.Stripe.IsValid)
            {
                return (null, null, wallet, null, "stripe-not-configured");
            }

            paymentSession = new PaymentSessionContract
            {
                Provider = "stripe",
                Status = "pending",
                Configured = true,
                CheckoutUrl = string.IsNullOrWhiteSpace(configuration.StripeCheckoutBaseUrl)
                    ? $"{configuration.WebBaseUrl.TrimEnd('/')}/checkout/stripe/{purchase.Id}"
                    : $"{configuration.StripeCheckoutBaseUrl.TrimEnd('/')}/{purchase.Id}",
                SessionId = $"stripe-session-{purchase.Id}",
                Hints = new Dictionary<string, string>
                {
                    ["publishableKeyAvailable"] = (!string.IsNullOrWhiteSpace(configuration.StripePublishableKey)).ToString().ToLowerInvariant(),
                    ["webhookConfigured"] = (!string.IsNullOrWhiteSpace(configuration.StripeWebhookSecret)).ToString().ToLowerInvariant(),
                },
            };
            purchase.ExternalReference = paymentSession.SessionId;
            await RecordPluginUsageAsync(paymentPlugin.Id, buyerId, "purchase.pending");
            await RecordMonitoringEventAsync("purchase", "media.purchase.pending", "success", $"Created Stripe scaffold for {purchase.Id}.");
        }

        await UpsertPurchaseAsync(purchase);
        await UpsertInvoiceAsync(invoice);
        await AppendAuditEventAsync(buyerId, "media.purchase.created", "media-item", mediaItem.Id, $"Created purchase {purchase.Id} using {input.PaymentMethod}.");
        return (purchase, invoice, wallet, paymentSession, null);
    }

    public async Task<List<ProcessingWorkItem>> ListProcessingWorkItemsAsync(string ownerId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<ProcessingWorkItem>(ProcessingWorkTable, ownerId) : [];
        return MergeByKey(_memory.ProcessingWork.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<List<MonitoringEvent>> ListMonitoringEventsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<MonitoringEvent>(MonitoringTable, "ops") : [];
        return MergeByKey(_memory.MonitoringEvents, stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<MonitoringSummary> GetMonitoringSummaryAsync()
    {
        var purchases = await ListAllPurchasesAsync();
        var processing = await ListAllProcessingWorkAsync();
        var seedImports = await ListSeedImportsAsync();
        var events = await ListMonitoringEventsAsync();
        return new MonitoringSummary
        {
            PurchaseCount = purchases.Count,
            PendingProcessingJobs = processing.Count(entry => entry.Status is "queued" or "processing"),
            SeedImports = seedImports.Count,
            TelemetryEvents = events.Count,
            UpdatedAt = UtcNow(),
        };
    }

    public async Task<StorageUsageReport> GetStorageUsageReportAsync()
    {
        var media = tables.Enabled
            ? await tables.ListAsync<MediaItem>(MediaItemsTable)
            : _memory.MediaItems.Values.Select(Clone).ToList();
        var active = media.Where(item => string.IsNullOrWhiteSpace(item.DeletedAt)).ToList();
        var totalUsed = active.Sum(item => item.FileSizeBytes);
        var grouped = active
            .GroupBy(item => item.MediaType)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.OrdinalIgnoreCase);
        var trend = active
            .GroupBy(item => DateTimeOffset.TryParse(item.CreatedAt, out var createdAt) ? $"{createdAt:yyyy-MM}" : "unknown")
            .OrderBy(group => group.Key)
            .Select(group => new StorageUsageTrendPoint
            {
                Period = group.Key,
                UsedBytes = group.Sum(item => item.FileSizeBytes),
                ObjectCount = group.Count(),
            })
            .ToList();
        return new StorageUsageReport
        {
            TotalUsedBytes = totalUsed,
            SoftCapBytes = configuration.System.StorageSoftCapBytes,
            RemainingEstimateBytes = Math.Max(0, configuration.System.StorageSoftCapBytes - totalUsed),
            ObjectCountsByMediaType = grouped,
            Trend = trend,
        };
    }

    public async Task<MediaCollection?> MarkCollectionReadyForPublishAsync(string ownerId, string collectionId)
    {
        var collection = await GetCollectionAsync(ownerId, collectionId);
        if (collection is null || collection.OwnerId != ownerId || collection.Status == "deleted")
        {
            return null;
        }
        collection.PublishApprovalStatus = "pending";
        collection.PublishReadyAt = UtcNow();
        collection.PublishRejectedAt = null;
        collection.PublishRejectedReason = null;
        collection.PublishApprovedAt = null;
        collection.PublishApprovedByUserId = null;
        collection.PublishState = "draft";
        collection.UpdatedAt = UtcNow();
        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaCollectionsTable, ownerId, collection.Id, collection);
        }
        else
        {
            _memory.MediaCollections[collection.Id] = collection;
        }
        await AppendAuditEventAsync(ownerId, "media.collection.publish.ready", "media-collection", collection.Id, "Creator marked folder as ready for publish approval.");
        return Clone(collection);
    }

    public async Task<(MediaCollection? Collection, List<PublishPlatformLog> Logs)> ReviewCollectionPublishAsync(string actorUserId, AdminCollectionPublishReviewInput input)
    {
        var allCollections = tables.Enabled ? await tables.ListAsync<MediaCollection>(MediaCollectionsTable) : _memory.MediaCollections.Values.ToList();
        var collection = allCollections.FirstOrDefault(entry => entry.Id == input.CollectionId && entry.Status != "deleted");
        if (collection is null)
        {
            return (null, []);
        }

        collection.PublishApprovalStatus = input.Decision == "approve" ? "approved" : "rejected";
        collection.PublishApprovedByUserId = input.Decision == "approve" ? actorUserId : null;
        collection.PublishApprovedAt = input.Decision == "approve" ? UtcNow() : null;
        collection.PublishRejectedAt = input.Decision == "reject" ? UtcNow() : null;
        collection.PublishRejectedReason = input.Decision == "reject" ? input.Note.Trim() : null;
        collection.PublishState = input.Decision == "approve" ? "published" : "draft";
        collection.UpdatedAt = UtcNow();

        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaCollectionsTable, collection.OwnerId, collection.Id, collection);
        }
        else
        {
            _memory.MediaCollections[collection.Id] = collection;
        }

        await AppendAuditEventAsync(actorUserId, "admin.collection.publish.reviewed", "media-collection", collection.Id, $"{input.Decision} publish request for collection {collection.Id}.", collection.OwnerId);
        if (input.Decision != "approve")
        {
            return (Clone(collection), []);
        }

        var settings = await GetOrCreateAccountSettingsAsync(collection.OwnerId);
        if (!settings.PublishPreferences.AutoPublishEnabled)
        {
            return (Clone(collection), []);
        }

        var items = await ListAllMediaItemsAsync(collection.OwnerId);
        var eligible = items.Where(item => item.CollectionId == collection.Id && item.UploadStatus == "ready" && string.IsNullOrWhiteSpace(item.DeletedAt)).ToList();
        var logs = new List<PublishPlatformLog>();
        foreach (var platform in settings.PublishPreferences.DesiredPlatforms.Select(value => value.Trim().ToLowerInvariant()).Where(value => value.Length > 0).Distinct(StringComparer.Ordinal))
        {
            var managedAccountId = configuration.System.ManagedPlatformAccounts.TryGetValue(platform, out var accountId) ? accountId : string.Empty;
            if (string.IsNullOrWhiteSpace(managedAccountId))
            {
                continue;
            }
            foreach (var item in eligible)
            {
                item.PublishState = "published";
                item.UpdatedAt = UtcNow();
                if (tables.Enabled)
                {
                    await tables.UpsertAsync(MediaItemsTable, item.OwnerId, item.Id, item);
                }
                else
                {
                    _memory.MediaItems[item.Id] = item;
                }
            }
            var log = new PublishPlatformLog
            {
                Id = CreateId("publish-log"),
                CollectionId = collection.Id,
                OwnerId = collection.OwnerId,
                Platform = platform,
                ManagedAccountId = managedAccountId,
                Status = "published",
                MetadataSummary = JsonSerializer.Serialize(collection.PublishMetadata),
                PublishedItemCount = eligible.Count,
                CreatedAt = UtcNow(),
            };
            if (tables.Enabled)
            {
                await tables.UpsertAsync(PublishLogsTable, collection.OwnerId, log.Id, log);
            }
            else
            {
                _memory.PublishLogs.Insert(0, log);
            }
            logs.Add(log);
            await AppendAuditEventAsync(actorUserId, "admin.collection.publish.fanned-out", "publish-log", log.Id, $"Published collection {collection.Id} to {platform} using managed account.", collection.OwnerId);
        }
        return (Clone(collection), logs);
    }

    public async Task<List<PublishPlatformLog>> ListPublishLogsAsync(string ownerId, string? collectionId = null)
    {
        var stored = tables.Enabled ? await tables.ListAsync<PublishPlatformLog>(PublishLogsTable, ownerId) : [];
        return MergeByKey(_memory.PublishLogs.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id)
            .Where(entry => string.IsNullOrWhiteSpace(collectionId) || entry.CollectionId == collectionId)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    public async Task<OnlyFansManagementStatus> GetOnlyFansManagementStatusAsync(string userId)
    {
        var plugin = (await ListPluginsAsync()).FirstOrDefault(entry => entry.Id == "onlyfans-chat");
        return new OnlyFansManagementStatus
        {
            Enabled = plugin?.Enabled == true,
            ConvenienceFeeRate = configuration.System.OnlyFansConvenienceFeeRate,
            PlatformCutRate = configuration.PlatformTransactionCutRate,
            ManagedAccountId = configuration.System.ManagedPlatformAccounts.TryGetValue("onlyfans", out var accountId) ? accountId : string.Empty,
        };
    }

    public async Task<SeedImportOperation> ImportSeedAsync(string actorUserId, AdminSeedImportInput input)
    {
        var manifest = await ResolveSeedManifestAsync(input);
        var applied = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

        foreach (var userEntry in manifest.Users)
        {
            await UpsertSeedUserAsync(userEntry);
        }
        applied["users"] = manifest.Users.Count;

        foreach (var walletEntry in manifest.Wallets)
        {
            var user = await GetOrCreateUserAsync(walletEntry.Email);
            var wallet = await GetOrCreateWalletAsync(user.Id, walletEntry.Currency.Trim().ToUpperInvariant());
            wallet.CreditsMinor = walletEntry.CreditsMinor;
            wallet.Currency = walletEntry.Currency.Trim().ToUpperInvariant();
            wallet.UpdatedAt = UtcNow();
            await UpsertWalletAsync(wallet);
        }
        applied["wallets"] = manifest.Wallets.Count;

        foreach (var pluginEntry in manifest.Plugins)
        {
            var plugin = await GetRequiredPluginAsync(pluginEntry.PluginId);
            plugin.Enabled = pluginEntry.Enabled;
            if (pluginEntry.AllowedPurchaseMethods.Count > 0)
            {
                plugin.PurchaseBehavior.AllowedPurchaseMethods = pluginEntry.AllowedPurchaseMethods.Distinct(StringComparer.Ordinal).ToList();
            }
            await UpsertPluginAsync(plugin);
        }
        applied["plugins"] = manifest.Plugins.Count;

        var operation = new SeedImportOperation
        {
            Id = CreateId("seed-import"),
            ActorUserId = actorUserId,
            Source = string.IsNullOrWhiteSpace(input.SourcePath) ? "inline-manifest" : ResolveSeedPath(input.SourcePath!),
            Status = "applied",
            AppliedCounts = applied,
            CreatedAt = UtcNow(),
        };

        await UpsertSeedImportAsync(operation);
        await AppendAuditEventAsync(actorUserId, "admin.seed.imported", "seed-import", operation.Id, $"Imported seed data from {operation.Source}.");
        await RecordMonitoringEventAsync("seed", "admin.seed.imported", "success", JsonSerializer.Serialize(applied));
        return operation;
    }

    public async Task<List<SeedImportOperation>> ListSeedImportsAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<SeedImportOperation>(SeedOperationsTable, "seed") : [];
        return MergeByKey(_memory.SeedImports, stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    private async Task<List<EarningsLedgerEntry>> ListEarningsLedgerAsync(string ownerId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<EarningsLedgerEntry>(EarningsLedgerTable, ownerId) : [];
        return MergeByKey(_memory.EarningsLedger.Where(entry => entry.OwnerId == ownerId), stored, entry => entry.Id)
            .OrderBy(entry => entry.PeriodStart)
            .Select(Clone)
            .ToList();
    }

    public async Task<List<MediaPurchaseRecord>> ListPurchasesForBuyerAsync(string buyerId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<MediaPurchaseRecord>(PurchasesTable, buyerId) : [];
        return MergeByKey(_memory.Purchases.Where(entry => entry.BuyerId == buyerId), stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    private async Task<List<PluginUsageRecord>> ListPluginUsageAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<PluginUsageRecord>(PluginUsageTable, "plugin") : [];
        return MergeByKey(_memory.PluginUsage, stored, entry => entry.Id)
            .OrderByDescending(entry => entry.CreatedAt)
            .Select(Clone)
            .ToList();
    }

    private async Task<PluginRuntimeState> GetRequiredPluginAsync(string pluginId)
        => (await ListPluginsAsync()).First(entry => entry.Id == pluginId);

    private async Task<MediaItem?> GetPurchasableMediaItemAsync(string mediaItemId)
    {
        var stored = tables.Enabled ? await tables.ListAsync<MediaItem>(MediaItemsTable) : [];
        return MergeByKey(_memory.MediaItems.Values, stored, entry => entry.Id)
            .FirstOrDefault(entry => entry.Id == mediaItemId && entry.PublishState == "published" && string.IsNullOrWhiteSpace(entry.DeletedAt));
    }

    private async Task ApplyCompletedPurchaseSideEffectsAsync(MediaItem mediaItem, MediaPurchaseRecord purchase, string completedAt)
    {
        mediaItem.SoldCount += 1;
        mediaItem.EarnedMinor += purchase.AmountMinor;
        mediaItem.UpdatedAt = completedAt;
        if (tables.Enabled)
        {
            await tables.UpsertAsync(MediaItemsTable, mediaItem.OwnerId, mediaItem.Id, mediaItem);
        }
        else
        {
            _memory.MediaItems[mediaItem.Id] = mediaItem;
        }

        var collection = await GetCollectionAsync(mediaItem.OwnerId, mediaItem.CollectionId);
        if (collection is not null)
        {
            collection.SoldCount += 1;
            collection.EarnedMinor += purchase.AmountMinor;
            collection.UpdatedAt = completedAt;
            if (tables.Enabled)
            {
                await tables.UpsertAsync(MediaCollectionsTable, collection.OwnerId, collection.Id, collection);
            }
            else
            {
                _memory.MediaCollections[collection.Id] = collection;
            }
        }

        await UpsertEarningsLedgerAsync(mediaItem.OwnerId, purchase.AmountMinor, purchase.Currency);
    }

    private async Task UpsertEarningsLedgerAsync(string ownerId, int grossMinor, string currency)
    {
        var period = $"{DateTimeOffset.UtcNow:yyyy-MM}-01";
        var entries = await ListEarningsLedgerAsync(ownerId);
        var existing = entries.FirstOrDefault(entry => entry.PeriodStart == period);
        var feesMinor = (int)Math.Round(grossMinor * configuration.PlatformTransactionCutRate, MidpointRounding.AwayFromZero);
        if (existing is null)
        {
            existing = new EarningsLedgerEntry
            {
                Id = CreateId("earn"),
                OwnerId = ownerId,
                PeriodStart = period,
                GrossMinor = grossMinor,
                NetMinor = grossMinor - feesMinor,
                FeesMinor = feesMinor,
                SoldCount = 1,
                Currency = currency,
            };
        }
        else
        {
            existing = new EarningsLedgerEntry
            {
                Id = existing.Id,
                OwnerId = ownerId,
                PeriodStart = existing.PeriodStart,
                GrossMinor = existing.GrossMinor + grossMinor,
                NetMinor = existing.NetMinor + (grossMinor - feesMinor),
                FeesMinor = existing.FeesMinor + feesMinor,
                SoldCount = existing.SoldCount + 1,
                Currency = currency,
            };
        }

        if (tables.Enabled)
        {
            await tables.UpsertAsync(EarningsLedgerTable, ownerId, existing.Id, existing);
        }
        else
        {
            var index = _memory.EarningsLedger.FindIndex(entry => entry.Id == existing.Id);
            if (index >= 0)
            {
                _memory.EarningsLedger[index] = existing;
            }
            else
            {
                _memory.EarningsLedger.Add(existing);
            }
        }
    }

    private async Task RecordPluginUsageAsync(string pluginId, string userId, string action)
    {
        var usage = new PluginUsageRecord
        {
            Id = CreateId("plugin-usage"),
            PluginId = pluginId,
            UserId = userId,
            Action = action,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(PluginUsageTable, "plugin", usage.Id, usage);
        }
        else
        {
            _memory.PluginUsage.Insert(0, usage);
        }
    }

    private async Task RecordMonitoringEventAsync(string category, string name, string status, string detail)
    {
        var evt = new MonitoringEvent
        {
            Id = CreateId("telemetry"),
            Category = category,
            Name = name,
            Status = status,
            Detail = detail,
            CreatedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(MonitoringTable, "ops", evt.Id, evt);
        }
        else
        {
            _memory.MonitoringEvents.Insert(0, evt);
        }
    }

    private async Task<List<MediaPurchaseRecord>> ListAllPurchasesAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<MediaPurchaseRecord>(PurchasesTable) : [];
        return MergeByKey(_memory.Purchases, stored, entry => entry.Id).Select(Clone).ToList();
    }

    private async Task<List<ProcessingWorkItem>> ListAllProcessingWorkAsync()
    {
        var stored = tables.Enabled ? await tables.ListAsync<ProcessingWorkItem>(ProcessingWorkTable) : [];
        return MergeByKey(_memory.ProcessingWork, stored, entry => entry.Id).Select(Clone).ToList();
    }

    internal async Task<List<ProcessingWorkItem>> CreateProcessingWorkItemsAsync(MediaItem mediaItem)
    {
        var jobTypes = mediaItem.MediaType == "video"
            ? new[] { "metadata-scrub", "video-preview", "video-snapshot" }
            : new[] { "metadata-scrub", "image-preview" };
        var items = new List<ProcessingWorkItem>();
        foreach (var jobType in jobTypes)
        {
            var item = new ProcessingWorkItem
            {
                Id = CreateId("work"),
                OwnerId = mediaItem.OwnerId,
                MediaItemId = mediaItem.Id,
                QueueName = "media-processing",
                JobType = jobType,
                Status = jobType == "metadata-scrub" ? "processing" : "queued",
                AttemptCount = 0,
                CreatedAt = UtcNow(),
                UpdatedAt = UtcNow(),
            };

            if (tables.Enabled)
            {
                await tables.UpsertAsync(ProcessingWorkTable, mediaItem.OwnerId, item.Id, item);
            }
            else
            {
                _memory.ProcessingWork.Insert(0, item);
            }

            items.Add(item);
        }

        foreach (var hook in configuration.System.DerivativePolicyHooks)
        {
            var hookItem = new ProcessingWorkItem
            {
                Id = CreateId("work"),
                OwnerId = mediaItem.OwnerId,
                MediaItemId = mediaItem.Id,
                QueueName = "media-derivative-policy",
                JobType = "derivative-policy-hook",
                PolicyHook = hook,
                Status = "queued",
                AttemptCount = 0,
                CreatedAt = UtcNow(),
                UpdatedAt = UtcNow(),
            };
            if (tables.Enabled)
            {
                await tables.UpsertAsync(ProcessingWorkTable, mediaItem.OwnerId, hookItem.Id, hookItem);
            }
            else
            {
                _memory.ProcessingWork.Insert(0, hookItem);
            }
            items.Add(hookItem);
        }

        await RecordPluginUsageAsync("media-processing", mediaItem.OwnerId, "queue.created");
        await RecordMonitoringEventAsync("media", "media.processing.queued", "success", $"Queued {items.Count} processing jobs for {mediaItem.Id}.");
        return items.Select(Clone).ToList();
    }

    internal async Task<InternalUploadMetadata> CaptureUploadMetadataAsync(SessionRecord session, MediaItem mediaItem, string fileName, string contentType, string userAgent, string ipAddress)
    {
        var metadata = new InternalUploadMetadata
        {
            Id = CreateId("upload-metadata"),
            MediaItemId = mediaItem.Id,
            OwnerId = mediaItem.OwnerId,
            SessionId = session.Id,
            OriginalFileName = fileName,
            ContentType = contentType,
            UserAgentHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(userAgent ?? string.Empty))).ToLowerInvariant(),
            IpHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(ipAddress ?? string.Empty))).ToLowerInvariant(),
            CapturedAt = UtcNow(),
        };

        if (tables.Enabled)
        {
            await tables.UpsertAsync(UploadMetadataTable, mediaItem.OwnerId, metadata.Id, metadata);
        }
        else
        {
            _memory.UploadMetadata.Insert(0, metadata);
        }

        await RecordMonitoringEventAsync("media", "media.upload.metadata.captured", "success", $"Captured private upload metadata for {mediaItem.Id}.");
        return metadata;
    }

    private async Task<SeedManifest> ResolveSeedManifestAsync(AdminSeedImportInput input)
    {
        if (input.Manifest is not null)
        {
            return input.Manifest;
        }

        var path = ResolveSeedPath(input.SourcePath!);
        var json = await File.ReadAllTextAsync(path);
        var manifest = JsonSerializer.Deserialize<SeedManifest>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        return manifest ?? new SeedManifest();
    }

    private string ResolveSeedPath(string sourcePath)
    {
        var root = Path.GetFullPath(configuration.SeedImportRoot ?? Environment.CurrentDirectory);
        var candidate = Path.GetFullPath(Path.IsPathRooted(sourcePath) ? sourcePath : Path.Combine(root, sourcePath));
        if (!candidate.StartsWith(root, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("seed-path-outside-root");
        }

        return candidate;
    }

    private async Task UpsertSeedUserAsync(SeedUserEntry input)
    {
        var existing = await GetOrCreateUserAsync(input.Email);
        existing.DisplayName = string.IsNullOrWhiteSpace(input.DisplayName) ? existing.DisplayName : input.DisplayName.Trim();
        existing.Role = string.IsNullOrWhiteSpace(input.Role) ? existing.Role : input.Role.Trim();
        await UpsertUserAsync(existing);
    }

    private async Task UpsertUserAsync(UserProfile user)
    {
        var normalizedEmail = NormalizeKey(user.Email);
        if (tables.Enabled)
        {
            await tables.UpsertAsync(UsersTable, normalizedEmail, "profile", user);
            return;
        }

        _memory.Users[user.Id] = user;
        _memory.UsersByEmail[normalizedEmail] = user;
    }

    private async Task UpsertWalletAsync(AccountWallet wallet)
    {
        if (tables.Enabled)
        {
            await tables.UpsertAsync(WalletsTable, wallet.UserId, "wallet", wallet);
            return;
        }

        _memory.Wallets[wallet.UserId] = wallet;
    }

    private async Task UpsertInvoiceAsync(InvoiceRecord invoice)
    {
        if (tables.Enabled)
        {
            await tables.UpsertAsync(InvoicesTable, invoice.UserId, invoice.Id, invoice);
            return;
        }

        _memory.Invoices.Insert(0, invoice);
    }

    private async Task UpsertPurchaseAsync(MediaPurchaseRecord purchase)
    {
        if (tables.Enabled)
        {
            await tables.UpsertAsync(PurchasesTable, purchase.BuyerId, purchase.Id, purchase);
            return;
        }

        _memory.Purchases.Insert(0, purchase);
    }

    private async Task UpsertPluginAsync(PluginRuntimeState plugin)
    {
        if (tables.Enabled)
        {
            await tables.UpsertAsync(PluginsTable, "plugin", plugin.Id, plugin);
            return;
        }

        var index = _memory.Plugins.FindIndex(entry => entry.Id == plugin.Id);
        if (index >= 0)
        {
            _memory.Plugins[index] = plugin;
        }
        else
        {
            _memory.Plugins.Add(plugin);
        }
    }

    private async Task UpsertSeedImportAsync(SeedImportOperation operation)
    {
        if (tables.Enabled)
        {
            await tables.UpsertAsync(SeedOperationsTable, "seed", operation.Id, operation);
            return;
        }

        _memory.SeedImports.Insert(0, operation);
    }

    private static string BuildInvoiceLabel(AccountSettings settings, PluginRuntimeState plugin)
    {
        if (plugin.PurchaseBehavior.AllowEntertainmentLabeling && settings.PurchasePreferences.LabelAsEntertainment)
        {
            return string.IsNullOrWhiteSpace(settings.PurchasePreferences.EntertainmentLabelValue)
                ? "Entertainment content"
                : settings.PurchasePreferences.EntertainmentLabelValue.Trim();
        }

        return "Digital media purchase";
    }
}

public sealed partial class AppRepository
{
    private sealed partial class SeedData
    {
        public List<ConnectorDefinition> Connectors { get; init; } = [];
        public List<AppModule> Modules { get; init; } = [];
        public List<PluginRuntimeState> Plugins { get; init; } = [];
        public Dictionary<string, AccountWallet> Wallets { get; init; } = [];
        public List<InvoiceRecord> Invoices { get; init; } = [];
        public List<MediaPurchaseRecord> Purchases { get; init; } = [];
        public List<PluginUsageRecord> PluginUsage { get; init; } = [];
        public List<ProcessingWorkItem> ProcessingWork { get; init; } = [];
        public List<InternalUploadMetadata> UploadMetadata { get; init; } = [];
        public List<MonitoringEvent> MonitoringEvents { get; init; } = [];
        public List<SeedImportOperation> SeedImports { get; init; } = [];
        public List<PublishPlatformLog> PublishLogs { get; init; } = [];
    }

    static partial void ExtendSeed(SeedData seed)
    {
        seed.Connectors.AddRange(
        [
            new ConnectorDefinition { Id = "stripe", Name = "Stripe Payments", Type = "payment", Status = "ready-for-config", McpCapable = true, Description = "Configurable payment provider with checkout scaffolding and audit trails.", Scopes = ["checkout", "webhooks", "refunds"], ModuleIds = ["payments-core"] },
            new ConnectorDefinition { Id = "instagram", Name = "Instagram Connector", Type = "publishing", Status = "template", McpCapable = true, Description = "Connector manifest for profile linking and analytics ingestion.", Scopes = ["account-linking", "publishing-metadata", "analytics-read"], ModuleIds = ["creator-analytics"] },
            new ConnectorDefinition { Id = "tiktok", Name = "TikTok Connector", Type = "publishing", Status = "template", McpCapable = true, Description = "Short-form platform connector template with policy gate placeholders.", Scopes = ["account-linking", "analytics-read", "content-queue"], ModuleIds = ["creator-analytics"] },
            new ConnectorDefinition { Id = "onlyfans", Name = "OnlyFans Readiness Connector", Type = "publishing", Status = "template", McpCapable = true, Description = "Readiness scaffolding for identity, consent, and policy gating.", Scopes = ["account-linking", "metrics-read", "compliance-checks"], ModuleIds = ["adult-platform-readiness"] },
            new ConnectorDefinition { Id = "pornhub", Name = "Pornhub Readiness Connector", Type = "publishing", Status = "template", McpCapable = true, Description = "Manual-readiness connector placeholder with no upload automation.", Scopes = ["account-linking", "manual-review"], ModuleIds = ["adult-platform-preview"] },
        ]);

        seed.Modules.AddRange(
        [
            new AppModule { Id = "payments-core", ConnectorId = "stripe", Name = "Payments core", Description = "Ledger-backed payment module with admin-tunable behavior.", DefaultChannel = "stable", MinimumAccountAgeDays = 0, StableRoute = "/account/wallet" },
            new AppModule { Id = "creator-analytics", ConnectorId = "instagram", Name = "Creator analytics", Description = "Stable analytics intake scaffolding for approved connectors.", DefaultChannel = "stable", MinimumAccountAgeDays = 7, StableRoute = "/dashboard/summary" },
            new AppModule { Id = "studio-preview", ConnectorId = "tiktok", Name = "Studio preview", Description = "Preview collaboration tooling for canary users with server-side enrollment.", DefaultChannel = "stable", MinimumAccountAgeDays = 14, StableRoute = "/studio/sessions", PreviewRoute = "/studio/sessions?channel=preview" },
            new AppModule { Id = "adult-platform-readiness", ConnectorId = "onlyfans", Name = "Adult platform readiness", Description = "Readiness-only module for age, identity, consent, and policy gating.", DefaultChannel = "stable", MinimumAccountAgeDays = 30, RequiresVerifiedIdentity = true, RequiresConsentReadiness = true, StableRoute = "/account/verification-readiness", PreviewRoute = "/account/verification-readiness?channel=preview" },
            new AppModule { Id = "adult-platform-preview", ConnectorId = "pornhub", Name = "Adult platform preview", Description = "Preview-only connector readiness module for canary rings.", DefaultChannel = "preview", MinimumAccountAgeDays = 60, RequiresVerifiedIdentity = true, RequiresConsentReadiness = true, StableRoute = "/account/verification-readiness", PreviewRoute = "/account/verification-readiness?channel=preview", PreviewOnly = true },
        ]);

        seed.Plugins.AddRange(
        [
            new PluginRuntimeState
            {
                Id = "stripe",
                DisplayName = "Stripe checkout",
                Category = "payment",
                Status = "ready-for-config",
                Description = "Credits and Stripe purchase orchestration.",
                Enabled = true,
                ClientVisible = true,
                PurchaseBehavior = new PurchaseBehaviorConfig
                {
                    DefaultPurchaseMethod = "credits",
                    AllowedPurchaseMethods = ["credits", "stripeCheckout"],
                    RequireAgeVerificationForAdultContent = true,
                    AllowEntertainmentLabeling = true,
                    MinimumPurchaseMinor = 100,
                    MaximumPurchaseMinor = 250_000,
                },
                ConfigurationHints = new Dictionary<string, string>(),
            },
            new PluginRuntimeState
            {
                Id = "paypal-payouts",
                DisplayName = "PayPal payouts",
                Category = "payout",
                Status = "template",
                Description = "Optional payout gateway scaffold for manual cash-out review.",
                Enabled = true,
                ClientVisible = false,
                AdminOnly = true,
                PayoutGateway = new PayoutGatewayConfig
                {
                    DefaultGateway = "manual",
                    AllowedGateways = ["manual", "paypalPayout"],
                },
                ConfigurationHints = new Dictionary<string, string>(),
            },
            new PluginRuntimeState
            {
                Id = "media-processing",
                DisplayName = "Media processing queue",
                Category = "processing",
                Status = "active",
                Description = "Queued metadata scrub, preview, and snapshot generation.",
                Enabled = true,
                ClientVisible = true,
                ConfigurationHints = new Dictionary<string, string>(),
            },
            new PluginRuntimeState
            {
                Id = "onlyfans-chat",
                DisplayName = "OnlyFans account and chat manager",
                Category = "publishing",
                Status = "template",
                Description = "Plugin-based scaffold for managed OnlyFans account/chat operations.",
                Enabled = false,
                ClientVisible = false,
                AdminOnly = true,
                ConfigurationHints = new Dictionary<string, string>(),
            },
        ]);

        if (seed.UsersByEmail.TryGetValue("anna-example-com", out var anna) && seed.UsersByEmail.TryGetValue("luca-example-com", out var luca))
        {
            var buyer = new UserProfile
            {
                Id = "user-buyer-zoe",
                Email = "zoe@example.com",
                Role = "creator",
                AccountTier = "starter",
                DisplayName = "Zoe",
                CreatedAt = DaysAgo(45),
            };
            seed.Users[buyer.Id] = buyer;
            seed.UsersByEmail[NormalizeKey(buyer.Email)] = buyer;
            seed.AccountProfiles[buyer.Id] = DefaultProfile(buyer);
            var buyerSettings = DefaultSettings(buyer.Id);
            buyerSettings.PurchasePreferences = new PurchasePreferenceSettings
            {
                AgeVerifiedAdult = false,
                LabelAsEntertainment = true,
                EntertainmentLabelValue = "Entertainment content",
            };
            seed.AccountSettings[buyer.Id] = buyerSettings;
            seed.Wallets[buyer.Id] = new AccountWallet { UserId = buyer.Id, CreditsMinor = 6500, Currency = "GBP", UpdatedAt = DaysAgo(1) };

            if (seed.MediaItems.TryGetValue("media-anna-ready-1", out var image))
            {
                image.FileName = "image-a1b2c3.jpg";
                image.Storage = new MediaStorageDescriptor
                {
                    BlobName = "2026-04/media-public-a1b2c3.jpg",
                    DownloadFileName = "image-a1b2c3.jpg",
                    SizeBytes = 8_388_608L,
                    PublicMetadata = new Dictionary<string, string> { ["contentClass"] = "image", ["identitySafe"] = "true" },
                };
                image.Preview = new MediaPreviewContract
                {
                    Status = "ready",
                    PreviewBlobUrl = "memory://preview/image-a1b2c3.jpg",
                    PosterFileName = "preview-a1b2c3.jpg",
                };
            }

            var adultMedia = new MediaItem
            {
                Id = "media-anna-adult-1",
                OwnerId = anna.Id,
                CollectionId = "collection-anna-editorial",
                FolderName = "anna-editorial-drop",
                Title = "Premium Night Reel",
                Description = "Adult-rated video ready for paid unlock.",
                FileName = "ignored-original.mp4",
                ContentType = "video/mp4",
                MediaType = "video",
                AgeRating = "adult",
                FileSizeBytes = 188_743_680L,
                UploadStatus = "ready",
                PublishState = "published",
                PriceMinor = 2200,
                Currency = "GBP",
                BlobUrl = "memory://media/anon-adult-1.mp4",
                UploadMode = "memory",
                BackgroundStreamId = "stream-media-anna-adult-1",
                BackgroundUpdatedAt = DaysAgo(1),
                Storage = new MediaStorageDescriptor
                {
                    BlobName = "2026-05/anon-a41de0.mp4",
                    DownloadFileName = "video-a41de0.mp4",
                    SizeBytes = 188_743_680L,
                    PublicMetadata = new Dictionary<string, string> { ["contentClass"] = "video", ["identitySafe"] = "true" },
                },
                Preview = new MediaPreviewContract
                {
                    Status = "ready",
                    SnapshotBlobUrl = "memory://preview/video-a41de0-snapshot.jpg",
                    PreviewBlobUrl = "memory://preview/video-a41de0-preview.mp4",
                    PosterFileName = "poster-a41de0.jpg",
                },
                Consent = new ConsentMetadata { PerformerCount = 1, AllAdultsConfirmed = true, RightsConfirmed = true, ConsentCapturedAt = DaysAgo(3), ConsentDocumentName = "editorial-consent", RecordRetentionYears = 7, Notes = "Adult-rated consent captured." },
                PolicyArtifact = seed.MediaItems["media-anna-ready-1"].PolicyArtifact,
                CreatedAt = DaysAgo(3),
                UpdatedAt = DaysAgo(1),
            };
            seed.MediaItems[adultMedia.Id] = adultMedia;
            seed.UploadEvents.Insert(0, new UploadStatusEvent { Id = "upload-event-anna-adult-1", OwnerId = anna.Id, MediaItemId = adultMedia.Id, Status = "ready", Message = "Adult-rated video completed queue processing.", CreatedAt = DaysAgo(1) });
            seed.ProcessingWork.AddRange(
            [
                new ProcessingWorkItem { Id = "work-adult-metadata", OwnerId = anna.Id, MediaItemId = adultMedia.Id, QueueName = "media-processing", JobType = "metadata-scrub", Status = "completed", CreatedAt = DaysAgo(3), UpdatedAt = DaysAgo(2) },
                new ProcessingWorkItem { Id = "work-adult-preview", OwnerId = anna.Id, MediaItemId = adultMedia.Id, QueueName = "media-processing", JobType = "video-preview", Status = "completed", CreatedAt = DaysAgo(3), UpdatedAt = DaysAgo(2) },
                new ProcessingWorkItem { Id = "work-adult-snapshot", OwnerId = anna.Id, MediaItemId = adultMedia.Id, QueueName = "media-processing", JobType = "video-snapshot", Status = "completed", CreatedAt = DaysAgo(3), UpdatedAt = DaysAgo(2) },
            ]);

            if (seed.MediaItems.TryGetValue("media-anna-processing-1", out var processing))
            {
                processing.AgeRating = "general";
                processing.FileName = "video-b7c8d9.mp4";
                processing.Storage = new MediaStorageDescriptor
                {
                    BlobName = "2026-05/anon-b7c8d9.mp4",
                    DownloadFileName = "video-b7c8d9.mp4",
                    SizeBytes = 157_286_400L,
                    PublicMetadata = new Dictionary<string, string> { ["contentClass"] = "video", ["identitySafe"] = "true" },
                };
                processing.Preview = new MediaPreviewContract
                {
                    Status = "queued",
                    PosterFileName = "poster-b7c8d9.jpg",
                };
            }

            if (seed.MediaItems.TryGetValue("media-luca-pending-1", out var lucaPending))
            {
                lucaPending.FileName = "image-l3f4g5.jpg";
                lucaPending.Storage = new MediaStorageDescriptor
                {
                    BlobName = "2026-05/anon-l3f4g5.jpg",
                    DownloadFileName = "image-l3f4g5.jpg",
                    SizeBytes = 6_291_456L,
                    PublicMetadata = new Dictionary<string, string> { ["contentClass"] = "image", ["identitySafe"] = "true" },
                };
                lucaPending.Preview = new MediaPreviewContract
                {
                    Status = "pending",
                    PosterFileName = "preview-l3f4g5.jpg",
                };
            }

            seed.PluginUsage.AddRange(
            [
                new PluginUsageRecord { Id = "plugin-usage-seed-1", PluginId = "media-processing", UserId = anna.Id, Action = "queue.completed", CreatedAt = DaysAgo(1) },
                new PluginUsageRecord { Id = "plugin-usage-seed-2", PluginId = "stripe", UserId = buyer.Id, Action = "wallet.ready", CreatedAt = DaysAgo(1) },
            ]);
            seed.MonitoringEvents.Add(new MonitoringEvent { Id = "telemetry-seed-1", Category = "platform", Name = "seed.bootstrap", Status = "success", Detail = "Loaded repository-backed starter data.", CreatedAt = DaysAgo(1) });
            seed.SeedImports.Add(new SeedImportOperation { Id = "seed-op-bootstrap", ActorUserId = "user-admin", Source = "embedded-seed", Status = "applied", AppliedCounts = new Dictionary<string, int> { ["users"] = seed.Users.Count, ["plugins"] = seed.Plugins.Count }, CreatedAt = DaysAgo(1) });
        }
    }
}
