using System.ComponentModel.DataAnnotations;

namespace OnlyFling.Api.Core;

public sealed class ErrorResponse
{
    public string Error { get; set; } = "request-failed";
    public Dictionary<string, string[]>? Details { get; set; }
}

public sealed class MeResponse
{
    public SessionUser User { get; set; } = new();
}

public sealed class SessionUser
{
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
}

public sealed class AuthRequestResponse
{
    public string Message { get; set; } = string.Empty;
    public string? DevelopmentCode { get; set; }
}

public sealed class AuthVerifyResponse
{
    public string Token { get; set; } = string.Empty;
    public UserProfile User { get; set; } = new();
}

public sealed class UserProfile
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "creator";
    public string AccountTier { get; set; } = "starter";
    public string DisplayName { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class SessionRecord
{
    public string Id { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string LastSeenAt { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
    public string? RevokedAt { get; set; }
    public string? DeviceLabel { get; set; }
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
}

public sealed class AuthChallenge
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public sealed class OnboardingRecord
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string WorkspaceName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public bool AcceptsTerms { get; set; }
    public bool AcceptsPrivacy { get; set; }
    public bool AcceptsMarketplacePolicy { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class CatalogItem
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PriceMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public string Type { get; set; } = "digital";
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class AuditEvent
{
    public string Id { get; set; } = string.Empty;
    public string ActorId { get; set; } = string.Empty;
    public string? AccountId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
}

public sealed class ModerationCase
{
    public string Id { get; set; } = string.Empty;
    public string WorkspaceName { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class DashboardSummary
{
    public int Creators { get; set; }
    public int Items { get; set; }
    public int OpenModerationCases { get; set; }
    public int ActiveConnectors { get; set; }
    public int MonthlyGrossMinor { get; set; }
    public string Currency { get; set; } = "GBP";
}

public sealed class ConnectorDefinition
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public bool McpCapable { get; set; }
    public string Description { get; set; } = string.Empty;
    public List<string> Scopes { get; set; } = [];
    public List<string> ModuleIds { get; set; } = [];
    public ModuleEligibility? Eligibility { get; set; }
}

public sealed class AppModule
{
    public string Id { get; set; } = string.Empty;
    public string ConnectorId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string DefaultChannel { get; set; } = "stable";
    public bool PreviewOnly { get; set; }
    public int MinimumAccountAgeDays { get; set; }
    public bool RequiresVerifiedIdentity { get; set; }
    public bool RequiresConsentReadiness { get; set; }
    public string StableRoute { get; set; } = string.Empty;
    public string? PreviewRoute { get; set; }
    public ModuleEligibility Eligibility { get; set; } = new();
    public PreviewEnrollment? Enrollment { get; set; }
}

public sealed class ModuleEligibility
{
    public bool Allowed { get; set; }
    public int CurrentAccountAgeDays { get; set; }
    public int MinimumAccountAgeDays { get; set; }
    public bool RequiresVerifiedIdentity { get; set; }
    public bool RequiresConsentReadiness { get; set; }
    public bool RequiresCanaryRing { get; set; }
    public bool RequiresPreviewEnrollment { get; set; }
    public string EffectiveChannel { get; set; } = "disabled";
    public string? EffectiveRoute { get; set; }
    public string? Reason { get; set; }
}

public sealed class PreviewEnrollment
{
    public string UserId { get; set; } = string.Empty;
    public string ModuleId { get; set; } = string.Empty;
    public string Channel { get; set; } = "preview";
    public string EnrolledAt { get; set; } = string.Empty;
}

public sealed class SubscriptionSummary
{
    public string Id { get; set; } = string.Empty;
    public string OwnerEmail { get; set; } = string.Empty;
    public string Plan { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string RenewalDate { get; set; } = string.Empty;
}

public sealed class EarningsReportRow
{
    public string Month { get; set; } = string.Empty;
    public int GrossMinor { get; set; }
    public int NetMinor { get; set; }
    public int FeesMinor { get; set; }
    public string Currency { get; set; } = "GBP";
}

public sealed class LeadRecord
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Stage { get; set; } = string.Empty;
    public int AiScore { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public sealed class QualificationRule
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public sealed class CollaborationProfile
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public double Latitude { get; set; }
    public double Longitude { get; set; }
    public bool LocationDisclosureAccepted { get; set; }
    public bool PromotedHighlight { get; set; }
    public bool PromotedDisclosureAccepted { get; set; }
    public bool NotifyOnNearby { get; set; }
    public bool AvailableNow { get; set; }
    public string ContactHandle { get; set; } = string.Empty;
    public List<string> Preferences { get; set; } = [];
    public List<string> CollaborationTypes { get; set; } = [];
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class NearbyMember
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public bool PromotedHighlight { get; set; }
    public bool AvailableNow { get; set; }
    public List<string> Preferences { get; set; } = [];
    public List<string> CollaborationTypes { get; set; } = [];
    public double DistanceKm { get; set; }
    public int PredictedAffinity { get; set; }
    public bool CanRequestContact { get; set; }
}

public sealed class CollaborationRequest
{
    public string Id { get; set; } = string.Empty;
    public string FromUserId { get; set; } = string.Empty;
    public string ToUserId { get; set; } = string.Empty;
    public string CollaborationType { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string? RespondedAt { get; set; }
}

public sealed class CollaborationAlert
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string TargetUserId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class PlatformRequest
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string PlatformName { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public string RequestedByDisplayName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int Votes { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class AffiliateCampaign
{
    public string Id { get; set; } = string.Empty;
    public string OwnerUserId { get; set; } = string.Empty;
    public string OwnerDisplayName { get; set; } = string.Empty;
    public string ShareCode { get; set; } = string.Empty;
    public string CtaCopy { get; set; } = string.Empty;
    public int RewardPercent { get; set; }
    public int CapSalesCount { get; set; }
    public int CapDays { get; set; }
    public int ActiveReferrals { get; set; }
    public int RewardMinorPaid { get; set; }
    public string Currency { get; set; } = "GBP";
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class MemberRequest
{
    public string Id { get; set; } = string.Empty;
    public string RequesterUserId { get; set; } = string.Empty;
    public string RequesterDisplayName { get; set; } = string.Empty;
    public string TargetUserId { get; set; } = string.Empty;
    public string TargetDisplayName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? PromisedByUserId { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? PromisedAt { get; set; }
    public string? FulfilledAt { get; set; }
}

public sealed class StudioSession
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string InitiatorUserId { get; set; } = string.Empty;
    public string CreatorAUserId { get; set; } = string.Empty;
    public string CreatorADisplayName { get; set; } = string.Empty;
    public string CreatorBUserId { get; set; } = string.Empty;
    public string CreatorBDisplayName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string SessionMode { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int GrossMinor { get; set; }
    public int FeesMinor { get; set; }
    public int NetMinor { get; set; }
    public int CreatorAShareMinor { get; set; }
    public int CreatorBShareMinor { get; set; }
    public int CreatorASharePercent { get; set; }
    public int CreatorBSharePercent { get; set; }
    public bool PartnerConfirmed { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class StudioTimelineEntry
{
    public string Id { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string ActorDisplayName { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public sealed class UserAccountProfile
{
    public string UserId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public AccountPreferences Preferences { get; set; } = new();
    public AccountPrivacy Privacy { get; set; } = new();
    public AccountContact Contact { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class AccountPreferences
{
    public List<string> ContentTags { get; set; } = [];
    public List<string> CollaborationInterests { get; set; } = [];
    public List<string> Languages { get; set; } = [];
}

public sealed class AccountPrivacy
{
    public string ProfileVisibility { get; set; } = "followers";
    public bool Discoverable { get; set; }
    public bool ShowActivity { get; set; }
    public bool AllowDirectMessages { get; set; }
}

public sealed class AccountContact
{
    public string SupportEmail { get; set; } = string.Empty;
    public bool EmailOptIn { get; set; }
    public bool MarketingOptIn { get; set; }
}

public sealed class CloseAccountState
{
    public string Status { get; set; } = "active";
    public string? RequestedAt { get; set; }
    public string? RequestedBySessionId { get; set; }
    public string? ClosedAt { get; set; }
    public string? Reason { get; set; }
    public bool? RetentionAcknowledged { get; set; }
    public bool? AccessLossAcknowledged { get; set; }
}

public sealed class AccountSettings
{
    public string UserId { get; set; } = string.Empty;
    public NotificationSettings Notifications { get; set; } = new();
    public DeviceSyncSettings DeviceSync { get; set; } = new();
    public PayoutPreferences PayoutPreferences { get; set; } = new();
    public PurchasePreferenceSettings PurchasePreferences { get; set; } = new();
    public PublishPreferenceSettings PublishPreferences { get; set; } = new();
    public CloseAccountState CloseAccount { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class PublishPreferenceSettings
{
    public bool AutoPublishEnabled { get; set; } = true;
    public List<string> DesiredPlatforms { get; set; } = ["instagram"];
}

public sealed class NotificationSettings
{
    public bool Email { get; set; }
    public bool Push { get; set; }
    public bool Product { get; set; }
    public bool Payouts { get; set; }
    public bool Security { get; set; }
}

public sealed class DeviceSyncSettings
{
    public bool Enabled { get; set; }
    public string CanonicalUpdatedAt { get; set; } = string.Empty;
    public string? LastSyncedSessionId { get; set; }
    public int SessionCount { get; set; }
}

public sealed class PayoutPreferences
{
    public string SettlementCurrency { get; set; } = "GBP";
    public string Schedule { get; set; } = "manual";
    public string MethodStatus { get; set; } = "not-configured";
}

public sealed class AccountSessionView
{
    public string Id { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string DeviceLabel { get; set; } = string.Empty;
    public string UserAgent { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
    public string LastSeenAt { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
    public string? RevokedAt { get; set; }
    public bool Current { get; set; }
}

public sealed class ConsentMetadata
{
    public int PerformerCount { get; set; }
    public bool AllAdultsConfirmed { get; set; }
    public bool RightsConfirmed { get; set; }
    public string ConsentCapturedAt { get; set; } = string.Empty;
    public string ConsentDocumentName { get; set; } = string.Empty;
    public int RecordRetentionYears { get; set; }
    public string Notes { get; set; } = string.Empty;
}

public sealed class PolicyArtifactRecord
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty;
    public string DocumentName { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string Uri { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class MediaCollection
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Visibility { get; set; } = "private";
    public string PublishState { get; set; } = "draft";
    public string PublishApprovalStatus { get; set; } = "not-ready";
    public string? PublishReadyAt { get; set; }
    public string? PublishApprovedAt { get; set; }
    public string? PublishApprovedByUserId { get; set; }
    public string? PublishRejectedAt { get; set; }
    public string? PublishRejectedReason { get; set; }
    public FolderPublishMetadata PublishMetadata { get; set; } = new();
    public int PriceMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public int SoldCount { get; set; }
    public int EarnedMinor { get; set; }
    public string Status { get; set; } = "active";
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string? DeletedAt { get; set; }
}

public sealed class MediaItem
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string CollectionId { get; set; } = string.Empty;
    public string FolderName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string MediaType { get; set; } = string.Empty;
    public string AgeRating { get; set; } = "general";
    public long FileSizeBytes { get; set; }
    public string UploadStatus { get; set; } = "pending";
    public string PublishState { get; set; } = "draft";
    public int PriceMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public int SoldCount { get; set; }
    public int EarnedMinor { get; set; }
    public string BlobUrl { get; set; } = string.Empty;
    public string? UploadUrl { get; set; }
    public string UploadMode { get; set; } = "memory";
    public string? ExpiresAt { get; set; }
    public Dictionary<string, string>? RequiredHeaders { get; set; }
    public string BackgroundStreamId { get; set; } = string.Empty;
    public string BackgroundUpdatedAt { get; set; } = string.Empty;
    public EncodingProfileMetadata EncodingProfile { get; set; } = new();
    public MediaStorageDescriptor Storage { get; set; } = new();
    public MediaPreviewContract Preview { get; set; } = new();
    public ConsentMetadata Consent { get; set; } = new();
    public PolicyArtifactRecord PolicyArtifact { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string? DeletedAt { get; set; }
}

public sealed class UploadStatusEvent
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public string MediaItemId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public sealed class UploadTarget
{
    public string Mode { get; set; } = "memory";
    public string UploadUrl { get; set; } = string.Empty;
    public string BlobUrl { get; set; } = string.Empty;
    public string? ExpiresAt { get; set; }
    public Dictionary<string, string>? RequiredHeaders { get; set; }
}

public sealed class EarningsSeriesPoint
{
    public string PeriodStart { get; set; } = string.Empty;
    public int GrossMinor { get; set; }
    public int NetMinor { get; set; }
    public int FeesMinor { get; set; }
    public int SoldCount { get; set; }
    public string Currency { get; set; } = "GBP";
}

public sealed class AccountEarningsSummary
{
    public string AccountId { get; set; } = string.Empty;
    public int TotalGrossMinor { get; set; }
    public int TotalNetMinor { get; set; }
    public int TotalFeesMinor { get; set; }
    public int AvailableForPayoutMinor { get; set; }
    public int PendingPayoutMinor { get; set; }
    public int PaidOutMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public string RangeStart { get; set; } = string.Empty;
    public string RangeEnd { get; set; } = string.Empty;
}

public sealed class PayoutRequest
{
    public string Id { get; set; } = string.Empty;
    public string OwnerId { get; set; } = string.Empty;
    public int AmountMinor { get; set; }
    public string Currency { get; set; } = "GBP";
    public string Status { get; set; } = string.Empty;
    public string Gateway { get; set; } = "manual";
    public string? GatewayReference { get; set; }
    public string Note { get; set; } = string.Empty;
    public string RequestedAt { get; set; } = string.Empty;
    public string? ProcessedAt { get; set; }
}

public sealed class VerificationStep
{
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public sealed class VerificationReadiness
{
    public string UserId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string IdentityStatus { get; set; } = string.Empty;
    public string PayoutStatus { get; set; } = string.Empty;
    public string ConsentStatus { get; set; } = string.Empty;
    public List<VerificationStep> RequiredSteps { get; set; } = [];
    public string UpdatedAt { get; set; } = string.Empty;
}

public sealed class AuthRequestInput
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
}

public sealed class AuthVerifyInput
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required, RegularExpression("^[0-9]{6}$")]
    public string Code { get; set; } = string.Empty;

    [StringLength(80, MinimumLength = 2)]
    public string? DeviceName { get; set; }
}

public sealed class OnboardingInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)]
    public string WorkspaceName { get; set; } = string.Empty;

    [Required, StringLength(80, MinimumLength = 2)]
    public string DisplayName { get; set; } = string.Empty;

    [Required]
    public string Region { get; set; } = string.Empty;

    public bool AcceptsTerms { get; set; }
    public bool AcceptsPrivacy { get; set; }
    public bool AcceptsMarketplacePolicy { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "UK", "EU", "GLOBAL" }.Contains(Region))
        {
            yield return new ValidationResult("Region must be UK, EU, or GLOBAL.", [nameof(Region)]);
        }
        if (!AcceptsTerms) yield return new ValidationResult("Terms must be accepted.", [nameof(AcceptsTerms)]);
        if (!AcceptsPrivacy) yield return new ValidationResult("Privacy must be accepted.", [nameof(AcceptsPrivacy)]);
        if (!AcceptsMarketplacePolicy) yield return new ValidationResult("Marketplace policy must be accepted.", [nameof(AcceptsMarketplacePolicy)]);
    }
}

public sealed class ItemInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)]
    public string Title { get; set; } = string.Empty;

    [Required, StringLength(400, MinimumLength = 10)]
    public string Description { get; set; } = string.Empty;

    [Range(1, 1_000_000)]
    public int PriceMinor { get; set; }

    [Required, StringLength(3, MinimumLength = 3)]
    public string Currency { get; set; } = "GBP";

    [Required]
    public string Type { get; set; } = "digital";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "digital", "physical", "service-request" }.Contains(Type))
        {
            yield return new ValidationResult("Unsupported item type.", [nameof(Type)]);
        }
    }
}

public sealed class UploadInput
{
    [Required, StringLength(200, MinimumLength = 1)]
    public string FileName { get; set; } = string.Empty;

    [Required, StringLength(120, MinimumLength = 3)]
    public string ContentType { get; set; } = string.Empty;
}

public sealed class CollaborationProfileInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)] public string DisplayName { get; set; } = string.Empty;
    [Required, StringLength(500, MinimumLength = 1)] public string AvatarUrl { get; set; } = string.Empty;
    [Required, StringLength(300, MinimumLength = 10)] public string Bio { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 2)] public string City { get; set; } = string.Empty;
    [Required, StringLength(2, MinimumLength = 2)] public string CountryCode { get; set; } = string.Empty;
    [Range(-90, 90)] public double Latitude { get; set; }
    [Range(-180, 180)] public double Longitude { get; set; }
    public bool LocationDisclosureAccepted { get; set; }
    public bool PromotedHighlight { get; set; }
    public bool PromotedDisclosureAccepted { get; set; }
    public bool NotifyOnNearby { get; set; }
    public bool AvailableNow { get; set; }
    [Required, StringLength(120, MinimumLength = 2)] public string ContactHandle { get; set; } = string.Empty;
    public List<string> Preferences { get; set; } = [];
    public List<string> CollaborationTypes { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (PromotedHighlight && !PromotedDisclosureAccepted)
        {
            yield return new ValidationResult("Paid highlighting requires promotedDisclosureAccepted.", [nameof(PromotedDisclosureAccepted)]);
        }
        if (Preferences.Count > 8 || Preferences.Any(p => string.IsNullOrWhiteSpace(p) || p.Trim().Length is < 2 or > 40))
        {
            yield return new ValidationResult("Preferences must contain 0-8 entries of 2-40 characters.", [nameof(Preferences)]);
        }
        if (CollaborationTypes.Count is < 1 or > 3 || CollaborationTypes.Any(t => !new[] { "photo", "video", "bundle" }.Contains(t)))
        {
            yield return new ValidationResult("Collaboration types must include 1-3 supported values.", [nameof(CollaborationTypes)]);
        }
    }
}

public sealed class CollaborationRequestInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string TargetUserId { get; set; } = string.Empty;
    [Required] public string CollaborationType { get; set; } = string.Empty;
    [Required, StringLength(220, MinimumLength = 5)] public string Note { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "photo", "video", "bundle" }.Contains(CollaborationType))
        {
            yield return new ValidationResult("Unsupported collaboration type.", [nameof(CollaborationType)]);
        }
    }
}

public sealed class CollaborationResponseInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string RequestId { get; set; } = string.Empty;
    public bool Accept { get; set; }
}

public sealed class PlatformRequestInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)] public string PlatformName { get; set; } = string.Empty;
    [Required] public string Type { get; set; } = string.Empty;
    [Required, StringLength(240, MinimumLength = 5)] public string Note { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "publishing", "payments", "analytics", "messaging", "crm" }.Contains(Type))
        {
            yield return new ValidationResult("Unsupported platform request type.", [nameof(Type)]);
        }
    }
}

public sealed class AffiliateCampaignInput
{
    [Required, StringLength(120, MinimumLength = 8)] public string CtaCopy { get; set; } = string.Empty;
    [Range(1, 40)] public int RewardPercent { get; set; }
    [Range(1, 50)] public int CapSalesCount { get; set; }
    [Range(1, 90)] public int CapDays { get; set; }
}

public sealed class MemberRequestInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string TargetUserId { get; set; } = string.Empty;
    [Required, StringLength(100, MinimumLength = 4)] public string Title { get; set; } = string.Empty;
    [Required, StringLength(300, MinimumLength = 8)] public string Details { get; set; } = string.Empty;
    [Required] public string Type { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "content-collab", "custom-request", "video-bundle" }.Contains(Type))
        {
            yield return new ValidationResult("Unsupported member request type.", [nameof(Type)]);
        }
    }
}

public sealed class MemberRequestActionInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string RequestId { get; set; } = string.Empty;
    [Required] public string Action { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "accept", "fulfill", "dispute" }.Contains(Action))
        {
            yield return new ValidationResult("Unsupported member request action.", [nameof(Action)]);
        }
    }
}

public sealed class StudioSessionInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 4)] public string Title { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 2)] public string PartnerUserId { get; set; } = string.Empty;
    [Required] public string ContentType { get; set; } = string.Empty;
    [Required] public string SessionMode { get; set; } = string.Empty;
    [Range(1, 5_000_000)] public int GrossMinor { get; set; }
    [Range(0, 1_000_000)] public int FeesMinor { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "photo", "video", "stream" }.Contains(ContentType))
        {
            yield return new ValidationResult("Unsupported content type.", [nameof(ContentType)]);
        }
        if (!new[] { "remote-stream", "upload-bundle" }.Contains(SessionMode))
        {
            yield return new ValidationResult("Unsupported session mode.", [nameof(SessionMode)]);
        }
        if (FeesMinor > GrossMinor)
        {
            yield return new ValidationResult("Fees cannot exceed gross.", [nameof(FeesMinor)]);
        }
    }
}

public sealed class StudioSessionActionInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string SessionId { get; set; } = string.Empty;
    [Required] public string Action { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "confirm-split", "start-session", "initiate-payout", "approve-payout", "dispute" }.Contains(Action))
        {
            yield return new ValidationResult("Unsupported studio action.", [nameof(Action)]);
        }
    }
}

public sealed class AccountProfileInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)] public string DisplayName { get; set; } = string.Empty;
    [StringLength(500)] public string Bio { get; set; } = string.Empty;
    [StringLength(500)] public string AvatarUrl { get; set; } = string.Empty;
    [Required] public AccountPreferences Preferences { get; set; } = new();
    [Required] public AccountPrivacy Privacy { get; set; } = new();
    [Required] public AccountContact Contact { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Preferences.ContentTags.Count > 12 || Preferences.ContentTags.Any(v => string.IsNullOrWhiteSpace(v) || v.Trim().Length is < 2 or > 32))
            yield return new ValidationResult("contentTags must contain up to 12 entries of 2-32 characters.", [nameof(Preferences.ContentTags)]);
        if (Preferences.CollaborationInterests.Count > 8 || Preferences.CollaborationInterests.Any(v => string.IsNullOrWhiteSpace(v) || v.Trim().Length is < 2 or > 32))
            yield return new ValidationResult("collaborationInterests must contain up to 8 entries of 2-32 characters.", [nameof(Preferences.CollaborationInterests)]);
        if (Preferences.Languages.Count > 6 || Preferences.Languages.Any(v => string.IsNullOrWhiteSpace(v) || v.Trim().Length is < 2 or > 24))
            yield return new ValidationResult("languages must contain up to 6 entries of 2-24 characters.", [nameof(Preferences.Languages)]);
        if (!new[] { "private", "followers", "public" }.Contains(Privacy.ProfileVisibility))
            yield return new ValidationResult("Unsupported profile visibility.", [nameof(Privacy.ProfileVisibility)]);
        if (!new EmailAddressAttribute().IsValid(Contact.SupportEmail))
            yield return new ValidationResult("supportEmail must be a valid email.", [nameof(Contact.SupportEmail)]);
    }
}

public sealed class AccountSettingsInput : IValidatableObject
{
    [Required] public NotificationSettings Notifications { get; set; } = new();
    [Required] public DeviceSyncInput DeviceSync { get; set; } = new();
    [Required] public PayoutPreferences PayoutPreferences { get; set; } = new();
    public PurchasePreferenceSettings PurchasePreferences { get; set; } = new();
    public PublishPreferenceSettings PublishPreferences { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "manual", "weekly", "monthly" }.Contains(PayoutPreferences.Schedule))
            yield return new ValidationResult("Unsupported payout schedule.", [nameof(PayoutPreferences.Schedule)]);
        if (!new[] { "not-configured", "pending", "ready" }.Contains(PayoutPreferences.MethodStatus))
            yield return new ValidationResult("Unsupported payout method status.", [nameof(PayoutPreferences.MethodStatus)]);
        if ((PayoutPreferences.SettlementCurrency ?? string.Empty).Trim().Length != 3)
            yield return new ValidationResult("Settlement currency must be 3 characters.", [nameof(PayoutPreferences.SettlementCurrency)]);
        if (PurchasePreferences.LabelAsEntertainment && string.IsNullOrWhiteSpace(PurchasePreferences.EntertainmentLabelValue))
            yield return new ValidationResult("Entertainment label value is required when purchase labeling is enabled.", [nameof(PurchasePreferences.EntertainmentLabelValue)]);
        if (PublishPreferences.DesiredPlatforms.Any(platform => string.IsNullOrWhiteSpace(platform) || platform.Trim().Length is < 2 or > 40))
            yield return new ValidationResult("Desired platforms contain invalid values.", [nameof(PublishPreferences.DesiredPlatforms)]);
    }
}

public sealed class DeviceSyncInput
{
    public bool Enabled { get; set; }
    [StringLength(120, MinimumLength = 2)] public string? LastSyncedSessionId { get; set; }
}

public sealed class RevokeSessionInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string SessionId { get; set; } = string.Empty;
}

public sealed class CloseAccountInput
{
    [Required] public string Action { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 2)] public string ConfirmDisplayName { get; set; } = string.Empty;
    [Required, EmailAddress] public string ConfirmEmail { get; set; } = string.Empty;
    public bool ConfirmRetentionAcknowledged { get; set; }
    public bool ConfirmAccessLossAcknowledged { get; set; }
    [StringLength(500)] public string Reason { get; set; } = string.Empty;
}

public class MediaCollectionInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)] public string FolderName { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 2)] public string Title { get; set; } = string.Empty;
    [StringLength(400)] public string Description { get; set; } = string.Empty;
    [Required] public string Visibility { get; set; } = "private";
    [Required] public string PublishState { get; set; } = "draft";
    public FolderPublishMetadata PublishMetadata { get; set; } = new();
    [Range(0, 5_000_000)] public int PriceMinor { get; set; }
    [Required, StringLength(3, MinimumLength = 3)] public string Currency { get; set; } = "GBP";
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(FolderName, "^[a-zA-Z0-9][a-zA-Z0-9-_\\s]{1,79}$"))
            yield return new ValidationResult("Invalid folder name.", [nameof(FolderName)]);
        if (!new[] { "private", "followers", "public" }.Contains(Visibility))
            yield return new ValidationResult("Unsupported visibility.", [nameof(Visibility)]);
        if (!new[] { "draft", "published" }.Contains(PublishState))
            yield return new ValidationResult("Unsupported publish state.", [nameof(PublishState)]);
    }
}

public sealed class MediaCollectionUpdateInput : MediaCollectionInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string CollectionId { get; set; } = string.Empty;
}

public sealed class MediaCollectionDeleteInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string CollectionId { get; set; } = string.Empty;
}

public sealed class MediaConsentInput : IValidatableObject
{
    [Range(1, 8)] public int PerformerCount { get; set; }
    public bool AllAdultsConfirmed { get; set; }
    public bool RightsConfirmed { get; set; }
    [Required] public string ConsentCapturedAt { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 2)] public string ConsentDocumentName { get; set; } = string.Empty;
    [Range(1, 10)] public int RecordRetentionYears { get; set; }
    [StringLength(300)] public string Notes { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!DateTimeOffset.TryParse(ConsentCapturedAt, out _))
            yield return new ValidationResult("consentCapturedAt must be an ISO datetime.", [nameof(ConsentCapturedAt)]);
        if (!AllAdultsConfirmed)
            yield return new ValidationResult("allAdultsConfirmed must be true.", [nameof(AllAdultsConfirmed)]);
        if (!RightsConfirmed)
            yield return new ValidationResult("rightsConfirmed must be true.", [nameof(RightsConfirmed)]);
        if (!System.Text.RegularExpressions.Regex.IsMatch(ConsentDocumentName, "^[a-zA-Z0-9][a-zA-Z0-9-_\\s]{1,79}$"))
            yield return new ValidationResult("Invalid consent document name.", [nameof(ConsentDocumentName)]);
    }
}

public sealed class MediaPolicyInput : IValidatableObject
{
    [Required, StringLength(80, MinimumLength = 2)] public string FolderName { get; set; } = string.Empty;
    [Required, StringLength(80, MinimumLength = 2)] public string DocumentName { get; set; } = string.Empty;
    [Required, StringLength(1000, MinimumLength = 10)] public string TermsSummary { get; set; } = string.Empty;
    [Required, StringLength(500, MinimumLength = 5)] public string PricingSummary { get; set; } = string.Empty;
    [StringLength(500)] public string AdditionalNotes { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!System.Text.RegularExpressions.Regex.IsMatch(FolderName, "^[a-zA-Z0-9][a-zA-Z0-9-_\\s]{1,79}$"))
            yield return new ValidationResult("Invalid folder name.", [nameof(FolderName)]);
        if (!System.Text.RegularExpressions.Regex.IsMatch(DocumentName, "^[a-zA-Z0-9][a-zA-Z0-9-_\\s]{1,79}$"))
            yield return new ValidationResult("Invalid document name.", [nameof(DocumentName)]);
    }
}

public sealed class FolderPublishMetadata
{
    [StringLength(400)] public string CaptionTemplate { get; set; } = string.Empty;
    public List<string> Hashtags { get; set; } = [];
    [StringLength(240)] public string ContentCategory { get; set; } = "general";
}

public sealed class EncodingProfileInput : IValidatableObject
{
    [Required] public string QualityProfile { get; set; } = "balanced";
    [Required] public string BitrateProfile { get; set; } = "standard";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "economy", "balanced", "high" }.Contains(QualityProfile))
            yield return new ValidationResult("Unsupported quality profile.", [nameof(QualityProfile)]);
        if (!new[] { "low", "standard", "high" }.Contains(BitrateProfile))
            yield return new ValidationResult("Unsupported bitrate profile.", [nameof(BitrateProfile)]);
    }
}

public sealed class EncodingProfileMetadata
{
    public string QualityProfile { get; set; } = "balanced";
    public string BitrateProfile { get; set; } = "standard";
}

public sealed class MediaUploadIntakeInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string CollectionId { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 2)] public string Title { get; set; } = string.Empty;
    [StringLength(500)] public string Description { get; set; } = string.Empty;
    [Required, StringLength(200, MinimumLength = 1)] public string FileName { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 3)] public string ContentType { get; set; } = string.Empty;
    [Required] public string MediaType { get; set; } = string.Empty;
    [Required] public string AgeRating { get; set; } = "general";
    [Range(1, 1_000_000_000)] public long FileSizeBytes { get; set; }
    [Range(0, 5_000_000)] public int PriceMinor { get; set; }
    [Required, StringLength(3, MinimumLength = 3)] public string Currency { get; set; } = "GBP";
    [Required] public string PublishState { get; set; } = "draft";
    [Required] public EncodingProfileInput EncodingProfile { get; set; } = new();
    [Required] public MediaConsentInput Consent { get; set; } = new();
    [Required] public MediaPolicyInput Policy { get; set; } = new();

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "image", "video" }.Contains(MediaType))
            yield return new ValidationResult("Unsupported media type.", [nameof(MediaType)]);
        if (!new[] { "general", "adult" }.Contains(AgeRating))
            yield return new ValidationResult("Unsupported age rating.", [nameof(AgeRating)]);
        if (!new[] { "draft", "published" }.Contains(PublishState))
            yield return new ValidationResult("Unsupported publish state.", [nameof(PublishState)]);
    }
}

public sealed class MediaItemUpdateInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string MediaItemId { get; set; } = string.Empty;
    [Required, StringLength(120, MinimumLength = 2)] public string Title { get; set; } = string.Empty;
    [StringLength(500)] public string Description { get; set; } = string.Empty;
    [Range(0, 5_000_000)] public int PriceMinor { get; set; }
    [Required, StringLength(3, MinimumLength = 3)] public string Currency { get; set; } = "GBP";
    [Required] public string PublishState { get; set; } = "draft";

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!new[] { "draft", "published" }.Contains(PublishState))
            yield return new ValidationResult("Unsupported publish state.", [nameof(PublishState)]);
    }
}

public sealed class MediaCollectionPublishReadyInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string CollectionId { get; set; } = string.Empty;
}

public sealed class AdminCollectionPublishReviewInput : IValidatableObject
{
    [Required, StringLength(120, MinimumLength = 2)] public string CollectionId { get; set; } = string.Empty;
    [Required] public string Decision { get; set; } = "approve";
    [StringLength(300)] public string Note { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Decision is not ("approve" or "reject"))
            yield return new ValidationResult("Decision must be approve or reject.", [nameof(Decision)]);
    }
}

public sealed class MediaItemDeleteInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string MediaItemId { get; set; } = string.Empty;
}

public sealed class PayoutRequestInput : IValidatableObject
{
    [Range(1_000, 5_000_000)] public int AmountMinor { get; set; }
    [StringLength(40, MinimumLength = 2)] public string Gateway { get; set; } = "manual";
    [StringLength(200)] public string Note { get; set; } = string.Empty;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Gateway is not ("manual" or "paypalPayout"))
        {
            yield return new ValidationResult("Unsupported payout gateway.", [nameof(Gateway)]);
        }
    }
}

public sealed class PreviewEnrollmentInput
{
    [Required, StringLength(120, MinimumLength = 2)] public string ModuleId { get; set; } = string.Empty;
}
