using System.Text.Json;

namespace OnlyFling.Api.Bdd.Support;

public sealed class ApiResponse : IDisposable
{
    public required int StatusCode { get; init; }
    public required string BodyText { get; init; }
    public JsonDocument? Json { get; init; }

    public void Dispose() => Json?.Dispose();
}
