using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.Azure.Functions.Worker.Http;

namespace OnlyFling.Api.Core;

public sealed class HttpResponseFactory(JsonSerializerOptions jsonOptions)
{
    public HttpResponseData CreateOptions(HttpRequestData request)
    {
        var response = request.CreateResponse(System.Net.HttpStatusCode.NoContent);
        AddCors(response);
        return response;
    }

    public async Task<HttpResponseData> JsonAsync(HttpRequestData request, object body, System.Net.HttpStatusCode statusCode = System.Net.HttpStatusCode.OK)
    {
        var response = request.CreateResponse(statusCode);
        AddCors(response);
        response.Headers.Add("content-type", "application/json; charset=utf-8");
        await response.WriteStringAsync(JsonSerializer.Serialize(body, jsonOptions));
        return response;
    }

    public Task<HttpResponseData> ErrorAsync(HttpRequestData request, string error, System.Net.HttpStatusCode statusCode, Dictionary<string, string[]>? details = null)
        => JsonAsync(request, new ErrorResponse { Error = error, Details = details }, statusCode);

    public static bool IsOptions(HttpRequestData request) => string.Equals(request.Method, "OPTIONS", StringComparison.OrdinalIgnoreCase);

    public static async Task<(T? Model, Dictionary<string, string[]>? Errors)> ReadAndValidateAsync<T>(HttpRequestData request) where T : class, new()
    {
        T? payload;
        try
        {
            payload = await request.ReadFromJsonAsync<T>();
        }
        catch (JsonException)
        {
            return (null, new Dictionary<string, string[]> { ["body"] = ["Invalid JSON payload."] });
        }

        if (payload is null)
        {
            return (null, new Dictionary<string, string[]> { ["body"] = ["Request body is required."] });
        }

        var errors = Validate(payload);
        return (payload, errors.Count == 0 ? null : errors);
    }

    public static Dictionary<string, string[]> Validate(object instance)
    {
        var results = new List<ValidationResult>();
        ValidateRecursive(instance, results, string.Empty);
        return results
            .GroupBy(result => result.MemberNames.FirstOrDefault() ?? "body")
            .ToDictionary(group => group.Key, group => group.Select(result => result.ErrorMessage ?? "Invalid value.").Distinct().ToArray());
    }

    private static void ValidateRecursive(object? instance, List<ValidationResult> results, string prefix)
    {
        if (instance is null)
        {
            return;
        }

        var context = new ValidationContext(instance);
        var local = new List<ValidationResult>();
        Validator.TryValidateObject(instance, context, local, true);
        foreach (var result in local)
        {
            var memberNames = result.MemberNames?.Any() == true
                ? result.MemberNames.Select(name => string.IsNullOrWhiteSpace(prefix) ? ToCamel(name) : $"{prefix}.{ToCamel(name)}")
                : new[] { string.IsNullOrWhiteSpace(prefix) ? "body" : prefix };
            results.Add(new ValidationResult(result.ErrorMessage, memberNames));
        }

        foreach (var property in instance.GetType().GetProperties())
        {
            if (!property.CanRead || property.PropertyType == typeof(string))
            {
                continue;
            }

            var value = property.GetValue(instance);
            var name = string.IsNullOrWhiteSpace(prefix) ? ToCamel(property.Name) : $"{prefix}.{ToCamel(property.Name)}";
            if (value is System.Collections.IEnumerable enumerable and not IDictionary<string, string>)
            {
                var index = 0;
                foreach (var item in enumerable)
                {
                    if (item is null || item is string || item.GetType().IsPrimitive)
                    {
                        index++;
                        continue;
                    }
                    ValidateRecursive(item, results, $"{name}[{index}]");
                    index++;
                }
                continue;
            }

            if (value is null || value.GetType().IsPrimitive)
            {
                continue;
            }

            if (value.GetType().Namespace?.StartsWith("OnlyFling.Api") == true)
            {
                ValidateRecursive(value, results, name);
            }
        }
    }

    public static string GetHeader(HttpRequestData request, string name)
        => request.Headers.TryGetValues(name, out var values) ? values.FirstOrDefault() ?? string.Empty : string.Empty;

    public static string? GetQuery(HttpRequestData request, string key)
    {
        var query = System.Web.HttpUtility.ParseQueryString(request.Url.Query);
        return query[key];
    }

    public static void AddCors(HttpResponseData response)
    {
        response.Headers.Add("access-control-allow-origin", "*");
        response.Headers.Add("access-control-allow-methods", "GET,POST,PUT,OPTIONS");
        response.Headers.Add("access-control-allow-headers", "authorization,content-type");
    }

    private static string ToCamel(string value)
        => string.IsNullOrEmpty(value) ? value : char.ToLowerInvariant(value[0]) + value[1..];
}
