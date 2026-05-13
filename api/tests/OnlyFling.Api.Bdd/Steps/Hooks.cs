using Reqnroll;
using OnlyFling.Api.Bdd.Support;
using Xunit;

namespace OnlyFling.Api.Bdd.Steps;

[Binding]
public sealed class Hooks(ApiTestWorld world)
{
    [BeforeFeature(Order = 0)]
    public static void SkipDeployedSmokeWithoutRemoteBase(FeatureContext featureContext)
    {
        var remoteBase = Environment.GetEnvironmentVariable("ONLYFLING_REMOTE_BASE_URL");
        if (string.IsNullOrWhiteSpace(remoteBase) && string.Equals(featureContext.FeatureInfo.Title, "Deployed public API smoke", StringComparison.OrdinalIgnoreCase))
        {
            throw new SkipException("Deployed smoke is only enabled when ONLYFLING_REMOTE_BASE_URL is set.");
        }

        if (string.IsNullOrWhiteSpace(remoteBase) && string.Equals(featureContext.FeatureInfo.Title, "Deployed authenticated API and UI journey", StringComparison.OrdinalIgnoreCase))
        {
            throw new SkipException("Deployed authenticated journey is only enabled when ONLYFLING_REMOTE_BASE_URL is set.");
        }

        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("ONLYFLING_BDD_REMOTE_AUTH_TOKEN")) &&
            string.Equals(featureContext.FeatureInfo.Title, "Deployed authenticated API and UI journey", StringComparison.OrdinalIgnoreCase))
        {
            throw new SkipException("Deployed authenticated journey is only enabled when ONLYFLING_BDD_REMOTE_AUTH_TOKEN is set.");
        }
    }

    [AfterScenario(Order = 1000)]
    public void Cleanup()
    {
        world.DisposeLastResponse();
        world.System.Dispose();
    }
}
