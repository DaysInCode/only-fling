using System.ComponentModel.DataAnnotations;

namespace OnlyFling.Api.Core;

public sealed class PurchasePreferenceSettings
{
    public bool AgeVerifiedAdult { get; set; }
    public bool LabelAsEntertainment { get; set; } = true;
    [StringLength(80)]
    public string EntertainmentLabelValue { get; set; } = "Entertainment content";
}

public sealed class AccountWallet
{
    public string UserId { get; set; } = string.Empty;
    public int CreditsMinor { get; set; }
    public int HeldMinor { get; set; }
    public int SpentMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class InvoiceLine
{
    public string Description { get; set; } = string.Empty;
    public int AmountMinor { get; set; }
    public string Currency { get; set; } = "GBP";
}

public sealed class InvoiceRecord
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string PurchaseId { get; set; } = string.Empty;
    public string MediaItemId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int TotalMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public List<InvoiceLine> Lines { get; set; } = [];
    public string CreatedAt { get; set; } = string.Empty;
    public string? SettledAt { get; set; }
}

public sealed class MediaPurchaseRecord
{
    public string Id { get; set; } = string.Empty;
    public string BuyerId { get; set; } = string.Empty;
    public string SellerId { get; set; } = string.Empty;
    public string MediaItemId { get; set; } = string.Empty;
    public string InvoiceId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PaymentMethod { get; set; } = string.Empty;
    public bool AdultContent { get; set; }
    public int AmountMinor { get; set; }
    public int ConvenienceFeeMinor { get; set; }
    public int PlatformCutMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public string? ExternalReference { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? CompletedAt { get; set; }
}

public sealed class PaymentSessionContract
{
    public string Provider { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool Configured { get; set; }
    public string? CheckoutUrl { get; set; }
    public string? SessionId { get; set; }
    public Dictionary<string, string> Hints { get; set; } = [];
}

public sealed class MediaStorageDescriptor
{
    public string BlobName { get; set; } = string.Empty;
    public string DownloadFileName { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public Dictionary<string, string> PublicMetadata { get; set; } = [];
}

public sealed class MediaPreviewContract
{
    public string Status { get; set; } = "pending";
    public string? SnapshotBlobUrl { get; set; }
    public string? PreviewBlobUrl { get; set; }
    public string? PosterFileName { get; set; }
}

public sealed class ProcessingWorkItem
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string MediaItemId { get; set; } = string.Empty;
    public string QueueName { get; set; } = string.Empty;
    public string JobType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int AttemptCount { get; set; }
    public string? PolicyHook { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class PublishPlatformLog
{
    public string Id { get; set; } = string.Empty;
    public string CollectionId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string ManagedAccountId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string MetadataSummary { get; set; } = string.Empty;
    public int PublishedItemCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class StorageUsageReport
{
    public long TotalUsedBytes { get; set; }
    public long SoftCapBytes { get; set; }
    public long RemainingEstimateBytes { get; set; }
    public Dictionary<string, int> ObjectCountsByMediaType { get; set; } = [];
    public List<StorageUsageTrendPoint> Trend { get; set; } = [];
}

public sealed class StorageUsageTrendPoint
{
    public string Period { get; set; } = string.Empty;
    public long UsedBytes { get; set; }
    public int ObjectCount { get; set; }
}

public sealed class OnlyFansManagementStatus
{
    public bool Enabled { get; set; }
    public decimal ConvenienceFeeRate { get; set; }
    public decimal PlatformCutRate { get; set; }
    public string ManagedAccountId { get; set; } = string.Empty;
}

public sealed class InternalUploadMetadata
{
    public string Id { get; set; } = string.Empty;
    public string MediaItemId { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string UserAgentHash { get; set; } = string.Empty;
    public string IpHash { get; set; } = string.Empty;
    public string CapturedAt { get; set; } = string.Empty;
}

public sealed class PurchaseBehaviorConfig
{
    public string DefaultPurchaseMethod { get; set; } = "credits";
    public List<string> AllowedPurchaseMethods { get; set; } = ["credits", "stripeCheckout"];
    public bool RequireAgeVerificationForAdultContent { get; set; } = true;
    public bool AllowEntertainmentLabeling { get; set; } = true;
    public int MinimumPurchaseMinor { get; set; } = 50;
    public int MaximumPurchaseMinor { get; set; } = 500_000;
}

public sealed class PayoutGatewayConfig
{
    public string DefaultGateway { get; set; } = "manual";
    public List<string> AllowedGateways { get; set; } = ["manual"];
}

public sealed class PluginUsageSummary
{
    public int UsageCount { get; set; }
    public string? LastUsedAt { get; set; }
}

public sealed class PluginRuntimeState
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool Enabled { get; set; }
    public bool ClientVisible { get; set; }
    public bool AdminOnly { get; set; }
    public PurchaseBehaviorConfig PurchaseBehavior { get; set; } = new();
    public PayoutGatewayConfig PayoutGateway { get; set; } = new();
    public PluginUsageSummary Usage { get; set; } = new();
    public Dictionary<string, string> ConfigurationHints { get; set; } = [];
}

public sealed class PluginUsageRecord
{
    public string Id { get; set; } = string.Empty;
    public string PluginId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class MonitoringEvent
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string Detail { get; set; } = string.Empty;
}

public sealed class MonitoringSummary
{
    public int PurchaseCount { get; set; }
    public int PendingProcessingJobs { get; set; }
    public int SeedImports { get; set; }
    public int TelemetryEvents { get; set; }
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class SeedImportOperation
{
    public string Id { get; set; } = string.Empty;
    public string ActorUserId { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public Dictionary<string, int> AppliedCounts { get; set; } = [];
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class AdminSeedImportInput : IValidatableObject
{
    [StringLength(300, MinimumLength = 1)]
    public string? SourcePath { get; set; }
    public SeedManifest? Manifest { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (string.IsNullOrWhiteSpace(SourcePath) && Manifest is null)
        {
            yield return new ValidationResult("Either sourcePath or manifest is required.", [nameof(SourcePath)]);
        }
    }
}

public sealed class SeedManifest
{
    public List<SeedUserEntry> Users { get; set; } = [];
    public List<SeedWalletEntry> Wallets { get; set; } = [];
    public List<SeedPluginEntry> Plugins { get; set; } = [];
}

public sealed class SeedUserEntry
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [StringLength(80, MinimumLength = 2)]
    public string DisplayName { get; set; } = string.Empty;
    [StringLength(40, MinimumLength = 4)]
    public string Role { get; set; } = "creator";
}

public sealed class SeedWalletEntry
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Range(0, 5_000_000)]
    public int CreditsMinor { get; set; }
    [StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "GBP";
}

public sealed class SeedPluginEntry
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string PluginId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public List<string> AllowedPurchaseMethods { get; set; } = [];
}

public sealed class AdminPluginConfigInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string PluginId { get; set; } = string.Empty;
    public bool? Enabled { get; set; }
    public PurchaseBehaviorConfig? PurchaseBehavior { get; set; }
    public PayoutGatewayConfig? PayoutGateway { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (PurchaseBehavior is not null)
        {
            if (!PurchaseBehavior.AllowedPurchaseMethods.All(method => method is "credits" or "stripeCheckout"))
            {
                yield return new ValidationResult("Unsupported purchase method.", [nameof(PurchaseBehavior.AllowedPurchaseMethods)]);
            }
            if (PurchaseBehavior.MinimumPurchaseMinor < 0 || PurchaseBehavior.MaximumPurchaseMinor < PurchaseBehavior.MinimumPurchaseMinor)
            {
                yield return new ValidationResult("Purchase limits are invalid.", [nameof(PurchaseBehavior.MaximumPurchaseMinor)]);
            }
        }

        if (PayoutGateway is not null)
        {
            if (!PayoutGateway.AllowedGateways.All(method => method is "manual" or "paypalPayout"))
            {
                yield return new ValidationResult("Unsupported payout gateway.", [nameof(PayoutGateway.AllowedGateways)]);
            }
        }
    }
}

public sealed class MediaPurchaseInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string MediaItemId { get; set; } = string.Empty;
    [StringLength(40, MinimumLength = 2)]
    public string PaymentMethod { get; set; } = "credits";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (PaymentMethod is not ("credits" or "stripeCheckout"))
        {
            yield return new ValidationResult("Unsupported payment method.", [nameof(PaymentMethod)]);
        }
    }
}
