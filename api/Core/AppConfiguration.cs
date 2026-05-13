namespace OnlyFling.Api.Core;

public sealed class AppConfiguration
{
    public SystemRuntimeConfig System { get; } = SystemRuntimeConfig.FromEnvironment();
    public StripeProviderConfig Stripe { get; } = StripeProviderConfig.FromEnvironment();
    public string AdminEmail { get; } = Environment.GetEnvironmentVariable("BOOTSTRAP_ADMIN_EMAIL") ?? "admin@example.com";
    public string StorageConnectionString { get; } = Environment.GetEnvironmentVariable("AzureWebJobsStorage") ?? string.Empty;
    public string UploadContainerName { get; } = Environment.GetEnvironmentVariable("UPLOAD_CONTAINER_NAME") ?? "uploads";
    public string ArtifactContainerName { get; } = Environment.GetEnvironmentVariable("ARTIFACT_CONTAINER_NAME") ?? "artifacts";
    public string StripeSecretKey => Stripe.SecretKey;
    public string StripePublishableKey => Stripe.PublishableKey;
    public string StripeWebhookSecret => Stripe.WebhookSecret;
    public string StripeCheckoutBaseUrl => Stripe.CheckoutBaseUrl;
    public string PaypalPayoutClientId { get; } = Environment.GetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_ID") ?? string.Empty;
    public string PaypalPayoutClientSecret { get; } = Environment.GetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_SECRET") ?? string.Empty;
    public string BddRemoteAuthToken { get; } = Environment.GetEnvironmentVariable("ONLYFLING_BDD_REMOTE_AUTH_TOKEN") ?? string.Empty;
    public string? SeedImportRoot { get; } = Environment.GetEnvironmentVariable("ADMIN_SEED_IMPORT_ROOT");
    public decimal PlatformTransactionCutRate => System.PlatformTransactionCutRate;
    public int PlatformFeePercent => (int)Math.Round(PlatformTransactionCutRate * 100m, MidpointRounding.AwayFromZero);
    public string WebBaseUrl { get; } = Environment.GetEnvironmentVariable("NEXT_PUBLIC_WEB_BASE_URL") ?? "http://127.0.0.1:3000";
    public string DeploymentRing { get; } = (Environment.GetEnvironmentVariable("DEPLOYMENT_RING") ?? "primary").Trim().ToLowerInvariant();
    public bool IsLocalDevelopment => string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID"));
    public bool StripeConfigured => Stripe.IsConfigured;
    public bool PaypalPayoutConfigured => !string.IsNullOrWhiteSpace(PaypalPayoutClientId) && !string.IsNullOrWhiteSpace(PaypalPayoutClientSecret);
    public bool BddRemoteAuthConfigured => !string.IsNullOrWhiteSpace(BddRemoteAuthToken);
    public bool DevModeExposeAuthCodes { get; } = string.Equals(Environment.GetEnvironmentVariable("ONLYFLING_DEV_MODE_AUTH_CODES"), "true", StringComparison.OrdinalIgnoreCase);
    public bool StorageEnabled
    {
        get
        {
            if (string.Equals(Environment.GetEnvironmentVariable("ONLYFLING_DISABLE_APP_STORAGE"), "true", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }
            return !string.IsNullOrWhiteSpace(StorageConnectionString);
        }
    }
}

public sealed class StripeProviderConfig
{
    public string SecretKey { get; init; } = string.Empty;
    public string PublishableKey { get; init; } = string.Empty;
    public string WebhookSecret { get; init; } = string.Empty;
    public string CheckoutBaseUrl { get; init; } = string.Empty;
    public bool IsConfigured => !string.IsNullOrWhiteSpace(SecretKey) && !string.IsNullOrWhiteSpace(PublishableKey);
    public bool IsValid => ValidationErrors.Count == 0;
    public IReadOnlyList<string> ValidationErrors { get; init; } = [];

    public static StripeProviderConfig FromEnvironment()
    {
        var config = new StripeProviderConfig
        {
            SecretKey = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY") ?? string.Empty,
            PublishableKey = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY") ?? string.Empty,
            WebhookSecret = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET") ?? string.Empty,
            CheckoutBaseUrl = Environment.GetEnvironmentVariable("STRIPE_CHECKOUT_BASE_URL") ?? string.Empty,
        };
        var errors = new List<string>();
        if (!string.IsNullOrWhiteSpace(config.CheckoutBaseUrl) && !Uri.TryCreate(config.CheckoutBaseUrl, UriKind.Absolute, out _))
        {
            errors.Add("stripe.checkoutBaseUrl.invalid");
        }
        if (!string.IsNullOrWhiteSpace(config.SecretKey) ^ !string.IsNullOrWhiteSpace(config.PublishableKey))
        {
            errors.Add("stripe.keys.partial");
        }
        return new StripeProviderConfig
        {
            SecretKey = config.SecretKey,
            PublishableKey = config.PublishableKey,
            WebhookSecret = config.WebhookSecret,
            CheckoutBaseUrl = config.CheckoutBaseUrl,
            ValidationErrors = errors,
        };
    }
}

public sealed class SystemRuntimeConfig
{
    public decimal PlatformTransactionCutRate { get; init; } = 0.05m;
    public decimal OnlyFansConvenienceFeeRate { get; init; } = 0.05m;
    public long StorageSoftCapBytes { get; init; } = 107_374_182_400L;
    public long ImageMaxUploadBytes { get; init; } = 52_428_800L;
    public long VideoMaxUploadBytes { get; init; } = 524_288_000L;
    public Dictionary<string, string> ManagedPlatformAccounts { get; init; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["instagram"] = "managed-instagram-primary",
        ["tiktok"] = "managed-tiktok-primary",
        ["onlyfans"] = "managed-onlyfans-primary",
    };
    public Dictionary<string, AccountTierQuotaConfig> AccountTierQuotas { get; init; } = new(StringComparer.OrdinalIgnoreCase)
    {
        ["starter"] = new AccountTierQuotaConfig { Tier = "starter", MonthlyStorageSoftCapBytes = 21_474_836_480L, MaxUploadBytes = 209_715_200L },
        ["pro"] = new AccountTierQuotaConfig { Tier = "pro", MonthlyStorageSoftCapBytes = 107_374_182_400L, MaxUploadBytes = 524_288_000L },
        ["studio"] = new AccountTierQuotaConfig { Tier = "studio", MonthlyStorageSoftCapBytes = 536_870_912_000L, MaxUploadBytes = 2_147_483_648L },
    };
    public List<string> DerivativePolicyHooks { get; init; } = ["content-safety", "watermark"];

    public static SystemRuntimeConfig FromEnvironment()
    {
        static decimal ReadDecimal(string key, decimal fallback)
            => decimal.TryParse(Environment.GetEnvironmentVariable(key), out var value) ? value : fallback;
        static long ReadLong(string key, long fallback)
            => long.TryParse(Environment.GetEnvironmentVariable(key), out var value) ? value : fallback;

        return new SystemRuntimeConfig
        {
            PlatformTransactionCutRate = Math.Clamp(ReadDecimal("SYSTEM_PLATFORM_TRANSACTION_CUT", 0.05m), 0m, 1m),
            OnlyFansConvenienceFeeRate = Math.Clamp(ReadDecimal("SYSTEM_ONLYFANS_CONVENIENCE_FEE_RATE", 0.05m), 0m, 1m),
            StorageSoftCapBytes = Math.Max(1_048_576L, ReadLong("SYSTEM_STORAGE_SOFT_CAP_BYTES", 107_374_182_400L)),
            ImageMaxUploadBytes = Math.Max(1_048_576L, ReadLong("SYSTEM_IMAGE_MAX_UPLOAD_BYTES", 52_428_800L)),
            VideoMaxUploadBytes = Math.Max(1_048_576L, ReadLong("SYSTEM_VIDEO_MAX_UPLOAD_BYTES", 524_288_000L)),
        };
    }
}

public sealed class AccountTierQuotaConfig
{
    public string Tier { get; init; } = "starter";
    public long MonthlyStorageSoftCapBytes { get; init; }
    public long MaxUploadBytes { get; init; }
}
