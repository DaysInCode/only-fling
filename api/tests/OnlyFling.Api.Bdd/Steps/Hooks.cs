using Reqnroll;
using OnlyFling.Api.Bdd.Support;

namespace OnlyFling.Api.Bdd.Steps;

[Binding]
public sealed class Hooks(ApiTestWorld world)
{
    [AfterScenario(Order = 1000)]
    public void Cleanup()
    {
        world.DisposeLastResponse();
        world.System.Dispose();
    }
}
