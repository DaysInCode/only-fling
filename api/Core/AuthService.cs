using Microsoft.Azure.Functions.Worker.Http;

namespace OnlyFling.Api.Core;

public sealed class AuthService(AppRepository repository)
{
    public async Task<SessionRecord?> GetBearerSessionAsync(HttpRequestData request)
    {
        var header = HttpResponseFactory.GetHeader(request, "authorization");
        if (string.IsNullOrWhiteSpace(header) || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = header["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var session = await repository.GetSessionAsync(token);
        if (session is null || session.RevokedAt is not null || string.CompareOrdinal(session.ExpiresAt, DateTimeOffset.UtcNow.ToString("O")) <= 0)
        {
            return null;
        }

        return await repository.TouchSessionAsync(token) ?? session;
    }
}
