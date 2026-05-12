using Microsoft.Extensions.Configuration;

var builder = DistributedApplication.CreateBuilder(args);

var stripeSecret = ReadStripeSetting(builder.Configuration, "SecretKey");
var stripePublishable = ReadStripeSetting(builder.Configuration, "PublishableKey");
var stripeWebhook = ReadStripeSetting(builder.Configuration, "WebhookSecret");
var stripeCheckoutBaseUrl = ReadStripeSetting(builder.Configuration, "CheckoutBaseUrl");

var azurite = builder.AddContainer("azurite", "mcr.microsoft.com/azure-storage/azurite", "3.35.0")
    .WithArgs(
        "azurite",
        "--blobHost", "0.0.0.0",
        "--queueHost", "0.0.0.0",
        "--tableHost", "0.0.0.0",
        "--location", "/data",
        "--debug", "/data/debug.log")
    .WithHttpEndpoint(port: 10000, targetPort: 10000, name: "blob")
    .WithHttpEndpoint(port: 10001, targetPort: 10001, name: "queue")
    .WithHttpEndpoint(port: 10002, targetPort: 10002, name: "table");

var api = builder.AddNpmApp("api", @"..\..\api", "run dev")
    .WaitFor(azurite)
    .WithEnvironment("AzureWebJobsStorage", "UseDevelopmentStorage=true")
    .WithEnvironment("NEXT_PUBLIC_WEB_BASE_URL", "http://127.0.0.1:3000")
    .WithEnvironment("STRIPE_SECRET_KEY", stripeSecret)
    .WithEnvironment("STRIPE_PUBLISHABLE_KEY", stripePublishable)
    .WithEnvironment("STRIPE_WEBHOOK_SECRET", stripeWebhook)
    .WithEnvironment("STRIPE_CHECKOUT_BASE_URL", stripeCheckoutBaseUrl)
    .WithHttpEndpoint(port: 7071, targetPort: 7071, name: "http")
    .WithExternalHttpEndpoints();

builder.AddNpmApp("web", @"..\..\web", "run dev -- --hostname 127.0.0.1 --port 3000")
    .WaitFor(api)
    .WithEnvironment("NEXT_PUBLIC_API_BASE_URL", "http://127.0.0.1:7071/api")
    .WithEnvironment("NEXT_PUBLIC_ENVIRONMENT", "aspire")
    .WithHttpEndpoint(port: 3000, targetPort: 3000, name: "http")
    .WithExternalHttpEndpoints();

builder.Build().Run();

static string ReadStripeSetting(IConfiguration configuration, string key)
{
    return configuration[$"STRIPE_{ToSnakeCase(key)}"]
        ?? configuration[$"Stripe:{key}"]
        ?? string.Empty;
}

static string ToSnakeCase(string value)
{
    var chars = new List<char>(value.Length + 4);
    for (var i = 0; i < value.Length; i++)
    {
        var c = value[i];
        if (i > 0 && char.IsUpper(c))
        {
            chars.Add('_');
        }

        chars.Add(char.ToUpperInvariant(c));
    }

    return new string(chars.ToArray());
}
