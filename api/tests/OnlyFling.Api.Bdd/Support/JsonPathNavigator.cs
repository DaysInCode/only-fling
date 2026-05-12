using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace OnlyFling.Api.Bdd.Support;

public static partial class JsonPathNavigator
{
    public static JsonElement GetRequired(JsonElement root, string path)
    {
        JsonElement current = root;
        foreach (var token in path.Split('.', StringSplitOptions.RemoveEmptyEntries))
        {
            var segment = token;
            while (true)
            {
                var match = IndexedSegment().Match(segment);
                if (!match.Success)
                {
                    if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(segment, out current))
                    {
                        throw new InvalidOperationException($"Path '{path}' was not found.");
                    }
                    break;
                }

                var property = match.Groups["name"].Value;
                if (!string.IsNullOrWhiteSpace(property))
                {
                    if (current.ValueKind != JsonValueKind.Object || !current.TryGetProperty(property, out current))
                    {
                        throw new InvalidOperationException($"Path '{path}' was not found.");
                    }
                }

                if (current.ValueKind != JsonValueKind.Array)
                {
                    throw new InvalidOperationException($"Path '{path}' does not point to an array.");
                }

                var index = int.Parse(match.Groups["index"].Value, CultureInfo.InvariantCulture);
                current = current[index];
                if (match.Length == segment.Length)
                {
                    break;
                }
                segment = segment[match.Length..];
            }
        }

        return current;
    }

    public static bool Matches(JsonElement element, string expected)
    {
        var normalized = expected.Trim();
        return element.ValueKind switch
        {
            JsonValueKind.String => string.Equals(element.GetString(), normalized, StringComparison.Ordinal),
            JsonValueKind.Number => element.ToString() == normalized,
            JsonValueKind.True => string.Equals(normalized, "true", StringComparison.OrdinalIgnoreCase),
            JsonValueKind.False => string.Equals(normalized, "false", StringComparison.OrdinalIgnoreCase),
            JsonValueKind.Null => string.Equals(normalized, "null", StringComparison.OrdinalIgnoreCase),
            _ => element.ToString() == normalized,
        };
    }

    [GeneratedRegex("^(?<name>[^\\[]+)?\\[(?<index>\\d+)\\]")]
    private static partial Regex IndexedSegment();
}
