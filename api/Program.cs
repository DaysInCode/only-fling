using System.Text.Json;
using System.Text.Json.Serialization;
using Azure.Core.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using OnlyFling.Api.Core;

var builder = new HostBuilder();
builder.ConfigureFunctionsWorkerDefaults();
builder.ConfigureServices(services =>
{
    var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DictionaryKeyPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };
    jsonOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase));

    services.AddSingleton(jsonOptions);
    services.Configure<WorkerOptions>(options =>
    {
        options.Serializer = new JsonObjectSerializer(jsonOptions);
    });

    services.AddSingleton<AppConfiguration>();
    services.AddSingleton<JsonTableStore>();
    services.AddSingleton<UploadService>();
    services.AddSingleton<AppRepository>();
    services.AddSingleton<AuthService>();
    services.AddSingleton<ModuleCatalogService>();
    services.AddSingleton<HttpResponseFactory>();
});

await builder.Build().RunAsync();
