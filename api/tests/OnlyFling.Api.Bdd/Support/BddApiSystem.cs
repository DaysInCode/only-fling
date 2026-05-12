using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OnlyFling.Api.Core;
using OnlyFling.Api.Functions;

namespace OnlyFling.Api.Bdd.Support;

public sealed class BddApiSystem : IDisposable
{
    private readonly string _originalCurrentDirectory = Environment.CurrentDirectory;
    private readonly string _workspacePath;
    private readonly IServiceProvider _requestServices;
    private readonly JsonSerializerOptions _jsonOptions;
    private readonly PublicFunctions _stablePublicFunctions;
    private readonly PublicFunctions _canaryPublicFunctions;
    private readonly AccountFunctions _accountFunctions;
    private readonly CollaborationFunctions _collaborationFunctions;
    private readonly AdminFunctions _adminFunctions;

    public BddApiSystem()
    {
        _workspacePath = Path.Combine(AppContext.BaseDirectory, "bdd-artifacts", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_workspacePath);
        Environment.CurrentDirectory = _workspacePath;

        _jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false,
        };
        _jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));
        _requestServices = BuildRequestServices(_jsonOptions);

        var stableConfiguration = CreateConfiguration("primary");
        var canaryConfiguration = CreateConfiguration("canary");
        var stableUploadService = new UploadService(stableConfiguration);
        var repository = new AppRepository(stableConfiguration, new JsonTableStore(stableConfiguration, _jsonOptions), stableUploadService);
        var authService = new AuthService(repository);
        var responses = new HttpResponseFactory(_jsonOptions);

        _stablePublicFunctions = new PublicFunctions(stableConfiguration, repository, authService, stableUploadService, new ModuleCatalogService(stableConfiguration, repository), responses);
        _canaryPublicFunctions = new PublicFunctions(canaryConfiguration, repository, authService, stableUploadService, new ModuleCatalogService(canaryConfiguration, repository), responses);
        _accountFunctions = new AccountFunctions(repository, authService, responses);
        _collaborationFunctions = new CollaborationFunctions(repository, authService, responses);
        _adminFunctions = new AdminFunctions(repository, authService, responses);
    }

    public string WorkspacePath => _workspacePath;

    public async Task<ApiResponse> SendAsync(string ring, string method, string route, string? bearerToken = null, string? jsonBody = null)
    {
        var normalizedRoute = route.Trim();
        var relative = normalizedRoute.StartsWith('/') ? normalizedRoute : $"/{normalizedRoute}";
        var request = CreateRequest(method, relative, bearerToken, jsonBody);
        var response = await DispatchAsync(ring, request, relative);
        response.Body.Position = 0;
        using var reader = new StreamReader(response.Body, Encoding.UTF8, leaveOpen: true);
        var bodyText = await reader.ReadToEndAsync();
        var json = string.IsNullOrWhiteSpace(bodyText) ? null : JsonDocument.Parse(bodyText);
        return new ApiResponse
        {
            StatusCode = (int)response.StatusCode,
            BodyText = bodyText,
            Json = json,
        };
    }

    public void Dispose()
    {
        Environment.CurrentDirectory = _originalCurrentDirectory;
        if (Directory.Exists(_workspacePath))
        {
            Directory.Delete(_workspacePath, recursive: true);
        }
    }

    private TestHttpRequestData CreateRequest(string method, string route, string? bearerToken, string? jsonBody)
    {
        var context = new TestFunctionContext(_requestServices);
        var uri = new Uri($"https://onlyfling.test{route}", UriKind.Absolute);
        var body = jsonBody is null ? new MemoryStream() : new MemoryStream(Encoding.UTF8.GetBytes(jsonBody));
        var request = new TestHttpRequestData(context, uri, method.ToUpperInvariant(), body);
        if (!string.IsNullOrWhiteSpace(bearerToken))
        {
            request.Headers.Add("authorization", $"Bearer {bearerToken}");
        }
        request.Headers.Add("content-type", "application/json");
        request.Headers.Add("user-agent", "OnlyFling.Api.Bdd");
        request.Headers.Add("x-forwarded-for", "127.0.0.1");
        return request;
    }

    private Task<HttpResponseData> DispatchAsync(string ring, HttpRequestData request, string route)
    {
        var publicFunctions = string.Equals(ring, "canary", StringComparison.OrdinalIgnoreCase)
            ? _canaryPublicFunctions
            : _stablePublicFunctions;

        var path = request.Url.AbsolutePath.Trim('/');
        return path switch
        {
            "health" => publicFunctions.Health(request),
            "connectors" => publicFunctions.Connectors(request),
            "connectors/modules" => publicFunctions.ConnectorModules(request),
            "connectors/preview/enroll" => publicFunctions.PreviewEnroll(request),
            "plugins/active" => publicFunctions.ActivePlugins(request),
            "auth/request-link" => publicFunctions.RequestLink(request),
            "auth/verify" => publicFunctions.VerifyLink(request),
            "me" => publicFunctions.Me(request),
            "account/profile" => _accountFunctions.AccountProfile(request),
            "account/settings" => _accountFunctions.AccountSettings(request),
            "account/wallet" => _accountFunctions.Wallet(request),
            "account/invoices" => _accountFunctions.Invoices(request),
            "account/platforms/onlyfans/manage" => _accountFunctions.OnlyFansManage(request),
            "account/sessions" => _accountFunctions.AccountSessions(request),
            "account/sessions/revoke" => _accountFunctions.AccountSessionsRevoke(request),
            "account/close" => _accountFunctions.AccountClose(request),
            "account/audit" => _accountFunctions.AccountAudit(request),
            "account/verification-readiness" => _accountFunctions.VerificationReadiness(request),
            "media/collections" => _accountFunctions.MediaCollections(request),
            "media/collections/update" => _accountFunctions.MediaCollectionUpdate(request),
            "media/collections/delete" => _accountFunctions.MediaCollectionDelete(request),
            "media/collections/publish-ready" => _accountFunctions.MediaCollectionPublishReady(request),
            "media/uploads/intake" => _accountFunctions.MediaUploadIntake(request),
            "media/uploads/events" => _accountFunctions.MediaUploadEvents(request),
            "media/uploads/queue" => _accountFunctions.MediaUploadQueue(request),
            "media/publishing/logs" => _accountFunctions.MediaPublishLogs(request),
            "media/items/update" => _accountFunctions.MediaItemUpdate(request),
            "media/items/delete" => _accountFunctions.MediaItemDelete(request),
            "media/items/purchase" => _accountFunctions.PurchaseMediaItem(request),
            "earnings/summary" => _accountFunctions.EarningsSummary(request),
            "payouts" => _accountFunctions.Payouts(request),
            "payouts/request" => _accountFunctions.PayoutRequest(request),
            "studio/sessions" => _collaborationFunctions.StudioSessions(request),
            _ when path.StartsWith("admin/", StringComparison.OrdinalIgnoreCase) => _adminFunctions.AdminRoutes(request, "admin", path["admin/".Length..]),
            _ when TryMatchCollectionItems(path, out var collectionId) => _accountFunctions.MediaCollectionItems(request, collectionId),
            _ => Task.FromResult(NotFound(request, route)),
        };
    }

    private static bool TryMatchCollectionItems(string path, out string collectionId)
    {
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length == 4 &&
            string.Equals(segments[0], "media", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(segments[1], "collections", StringComparison.OrdinalIgnoreCase) &&
            string.Equals(segments[3], "items", StringComparison.OrdinalIgnoreCase))
        {
            collectionId = segments[2];
            return true;
        }

        collectionId = string.Empty;
        return false;
    }

    private static HttpResponseData NotFound(HttpRequestData request, string route)
    {
        var response = request.CreateResponse(HttpStatusCode.NotFound);
        response.Headers.Add("content-type", "application/json; charset=utf-8");
        response.WriteString(JsonSerializer.Serialize(new { error = "route-not-implemented", route }));
        return response;
    }

    private static AppConfiguration CreateConfiguration(string ring)
    {
        var snapshot = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase)
        {
            ["DEPLOYMENT_RING"] = Environment.GetEnvironmentVariable("DEPLOYMENT_RING"),
            ["ONLYFLING_DISABLE_APP_STORAGE"] = Environment.GetEnvironmentVariable("ONLYFLING_DISABLE_APP_STORAGE"),
            ["AzureWebJobsStorage"] = Environment.GetEnvironmentVariable("AzureWebJobsStorage"),
            ["WEBSITE_INSTANCE_ID"] = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID"),
            ["BOOTSTRAP_ADMIN_EMAIL"] = Environment.GetEnvironmentVariable("BOOTSTRAP_ADMIN_EMAIL"),
            ["STRIPE_SECRET_KEY"] = Environment.GetEnvironmentVariable("STRIPE_SECRET_KEY"),
            ["STRIPE_PUBLISHABLE_KEY"] = Environment.GetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY"),
            ["STRIPE_WEBHOOK_SECRET"] = Environment.GetEnvironmentVariable("STRIPE_WEBHOOK_SECRET"),
            ["PAYPAL_PAYOUT_CLIENT_ID"] = Environment.GetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_ID"),
            ["PAYPAL_PAYOUT_CLIENT_SECRET"] = Environment.GetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_SECRET"),
            ["SYSTEM_PLATFORM_TRANSACTION_CUT"] = Environment.GetEnvironmentVariable("SYSTEM_PLATFORM_TRANSACTION_CUT"),
            ["SYSTEM_ONLYFANS_CONVENIENCE_FEE_RATE"] = Environment.GetEnvironmentVariable("SYSTEM_ONLYFANS_CONVENIENCE_FEE_RATE"),
        };

        try
        {
            Environment.SetEnvironmentVariable("DEPLOYMENT_RING", ring);
            Environment.SetEnvironmentVariable("ONLYFLING_DISABLE_APP_STORAGE", "true");
            Environment.SetEnvironmentVariable("AzureWebJobsStorage", string.Empty);
            Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", null);
            Environment.SetEnvironmentVariable("BOOTSTRAP_ADMIN_EMAIL", "admin@example.com");
            Environment.SetEnvironmentVariable("STRIPE_SECRET_KEY", "sk_test_configured");
            Environment.SetEnvironmentVariable("STRIPE_PUBLISHABLE_KEY", "pk_test_configured");
            Environment.SetEnvironmentVariable("STRIPE_WEBHOOK_SECRET", "whsec_configured");
            Environment.SetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_ID", "paypal-client");
            Environment.SetEnvironmentVariable("PAYPAL_PAYOUT_CLIENT_SECRET", "paypal-secret");
            Environment.SetEnvironmentVariable("SYSTEM_PLATFORM_TRANSACTION_CUT", "0.05");
            Environment.SetEnvironmentVariable("SYSTEM_ONLYFANS_CONVENIENCE_FEE_RATE", "0.05");
            return new AppConfiguration();
        }
        finally
        {
            foreach (var pair in snapshot)
            {
                Environment.SetEnvironmentVariable(pair.Key, pair.Value);
            }
        }
    }

    private static IServiceProvider BuildRequestServices(JsonSerializerOptions jsonOptions)
    {
        var services = new ServiceCollection();
        var serializer = new JsonObjectSerializer(jsonOptions);
        services.AddOptions();
        services.AddSingleton(jsonOptions);
        services.AddSingleton<ObjectSerializer>(serializer);
        services.AddSingleton<IOptions<WorkerOptions>>(_ => Options.Create(new WorkerOptions
        {
            Serializer = serializer,
        }));
        services.Configure<WorkerOptions>(options => options.Serializer = serializer);
        return services.BuildServiceProvider();
    }
}
