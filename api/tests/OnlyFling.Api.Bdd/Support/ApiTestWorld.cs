using System.Text.RegularExpressions;

namespace OnlyFling.Api.Bdd.Support;

public sealed class ApiTestWorld
{
    private readonly Dictionary<string, string> _values = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, SignedInAlias> _aliases = new(StringComparer.OrdinalIgnoreCase);

    public BddApiSystem System { get; } = new();
    public ApiResponse? LastResponse { get; set; }

    public void Save(string key, string value) => _values[key] = value;

    public void SaveAlias(string alias, SignedInAlias identity)
    {
        _aliases[alias] = identity;
        _values[$"{alias}.token"] = identity.Token;
        _values[$"{alias}.userId"] = identity.UserId;
        _values[$"{alias}.sessionId"] = identity.SessionId;
        _values[$"{alias}.email"] = identity.Email;
    }

    public string GetAliasToken(string alias) => _aliases.TryGetValue(alias, out var value)
        ? value.Token
        : throw new InvalidOperationException($"Unknown alias '{alias}'.");

    public string Resolve(string template)
        => Regex.Replace(template, "\\{\\{(?<key>[^}]+)\\}\\}", match =>
        {
            var key = match.Groups["key"].Value.Trim();
            if (_values.TryGetValue(key, out var value))
            {
                return value;
            }

            throw new InvalidOperationException($"Unknown saved value '{key}'.");
        });

    public void DisposeLastResponse()
    {
        LastResponse?.Dispose();
        LastResponse = null;
    }

    public sealed record SignedInAlias(string Email, string Token, string UserId, string SessionId);
}
