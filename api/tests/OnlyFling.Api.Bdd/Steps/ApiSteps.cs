using System.Text.Json;
using Reqnroll;
using Xunit;
using OnlyFling.Api.Bdd.Support;

namespace OnlyFling.Api.Bdd.Steps;

[Binding]
public sealed class ApiSteps(ApiTestWorld world)
{
    [Given(@"I sign in on the ""(.*)"" ring as ""(.*)"" using device ""(.*)"" and store it as ""(.*)""")]
    public async Task GivenISignInOnTheRingAsUsingDeviceAndStoreItAs(string ring, string email, string deviceName, string alias)
    {
        await SendAsync(ring, "POST", "/auth/request-link", jsonBody: $$"""
        {
          "email": "{{email}}"
        }
        """);
        Assert.Equal(200, world.LastResponse!.StatusCode);
        var code = JsonPathNavigator.GetRequired(world.LastResponse.Json!.RootElement, "developmentCode").GetString();
        Assert.False(string.IsNullOrWhiteSpace(code));

        await SendAsync(ring, "POST", "/auth/verify", jsonBody: $$"""
        {
          "email": "{{email}}",
          "code": "{{code}}",
          "deviceName": "{{deviceName}}"
        }
        """);
        Assert.Equal(200, world.LastResponse!.StatusCode);
        var token = JsonPathNavigator.GetRequired(world.LastResponse.Json!.RootElement, "token").GetString()!;
        var userId = JsonPathNavigator.GetRequired(world.LastResponse.Json.RootElement, "user.id").GetString()!;

        await SendAsync(ring, "GET", "/me", aliasToken: token);
        Assert.Equal(200, world.LastResponse!.StatusCode);
        var sessionId = JsonPathNavigator.GetRequired(world.LastResponse.Json!.RootElement, "user.sessionId").GetString()!;

        world.SaveAlias(alias, new ApiTestWorld.SignedInAlias(email, token, userId, sessionId));
    }

    [When(@"I send a ""(.*)"" request to ""(.*)"" on the ""(.*)"" ring")]
    public Task WhenISendARequestToOnTheRing(string method, string route, string ring)
        => SendAsync(ring, method, route);

    [When(@"I send a ""(.*)"" request to ""(.*)"" on the ""(.*)"" ring as ""(.*)""")]
    public Task WhenISendARequestToOnTheRingAs(string method, string route, string ring, string alias)
        => SendAsync(ring, method, route, alias: alias);

    [When(@"I send a ""(.*)"" request to ""(.*)"" on the ""(.*)"" ring with JSON:")]
    public Task WhenISendARequestToOnTheRingWithJson(string method, string route, string ring, string payload)
        => SendAsync(ring, method, route, jsonBody: payload);

    [When(@"I send a ""(.*)"" request to ""(.*)"" on the ""(.*)"" ring as ""(.*)"" with JSON:")]
    public Task WhenISendARequestToOnTheRingAsWithJson(string method, string route, string ring, string alias, string payload)
        => SendAsync(ring, method, route, alias: alias, jsonBody: payload);

    [Then(@"the response status should be (\d+)")]
    public void ThenTheResponseStatusShouldBe(int statusCode)
        => Assert.Equal(statusCode, world.LastResponse!.StatusCode);

    [Then(@"the response JSON at ""(.*)"" should equal ""(.*)""")]
    public void ThenTheResponseJsonAtShouldEqual(string path, string expected)
    {
        var actual = JsonPathNavigator.GetRequired(world.LastResponse!.Json!.RootElement, path);
        Assert.True(JsonPathNavigator.Matches(actual, world.Resolve(expected)), $"Expected '{path}' to equal '{expected}', but was '{actual}'.");
    }

    [Then(@"the response JSON array at ""(.*)"" should contain an object with:")]
    public void ThenTheResponseJsonArrayAtShouldContainAnObjectWith(string path, Table table)
    {
        var array = JsonPathNavigator.GetRequired(world.LastResponse!.Json!.RootElement, path);
        Assert.Equal(JsonValueKind.Array, array.ValueKind);

        var expected = table.Rows.Select(row => new
        {
            Path = row["path"],
            Value = world.Resolve(row["value"]),
        }).ToList();

        var match = array.EnumerateArray().FirstOrDefault(candidate =>
            expected.All(item => JsonPathNavigator.Matches(JsonPathNavigator.GetRequired(candidate, item.Path), item.Value)));

        Assert.True(match.ValueKind != JsonValueKind.Undefined, $"No object in '{path}' matched the expected values.");
    }

    [Then(@"I save the response JSON at ""(.*)"" as ""(.*)""")]
    public void ThenISaveTheResponseJsonAtAs(string path, string key)
    {
        var value = JsonPathNavigator.GetRequired(world.LastResponse!.Json!.RootElement, path).ToString();
        world.Save(key, value);
    }

    [Then(@"the response body should not contain ""(.*)""")]
    public void ThenTheResponseBodyShouldNotContain(string text)
        => Assert.DoesNotContain(world.Resolve(text), world.LastResponse!.BodyText, StringComparison.Ordinal);

    [Then(@"the file at ""(.*)"" should contain ""(.*)""")]
    public async Task ThenTheFileAtShouldContain(string path, string expectedText)
    {
        var resolvedPath = world.Resolve(path);
        Assert.True(File.Exists(resolvedPath), $"Expected file '{resolvedPath}' to exist.");
        var contents = await File.ReadAllTextAsync(resolvedPath);
        Assert.Contains(expectedText, contents, StringComparison.Ordinal);
    }

    [Given(@"I create a file at ""(.*)"" with JSON:")]
    public async Task GivenICreateAFileAtWithJson(string relativePath, string payload)
    {
        var resolvedPath = Path.GetFullPath(Path.Combine(world.System.WorkspacePath, world.Resolve(relativePath)));
        Directory.CreateDirectory(Path.GetDirectoryName(resolvedPath)!);
        await File.WriteAllTextAsync(resolvedPath, world.Resolve(payload));
        world.Save(relativePath, resolvedPath);
    }

    private async Task SendAsync(string ring, string method, string route, string? alias = null, string? aliasToken = null, string? jsonBody = null)
    {
        world.DisposeLastResponse();
        var token = aliasToken ?? (alias is null ? null : world.GetAliasToken(alias));
        var resolvedRoute = world.Resolve(route);
        var resolvedBody = jsonBody is null ? null : world.Resolve(jsonBody);
        world.LastResponse = await world.System.SendAsync(ring, method, resolvedRoute, token, resolvedBody);
    }
}
