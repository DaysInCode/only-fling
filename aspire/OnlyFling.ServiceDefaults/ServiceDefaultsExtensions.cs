using Microsoft.Extensions.Hosting;

namespace OnlyFling.ServiceDefaults;

public static class ServiceDefaultsExtensions
{
    public static TBuilder AddOnlyFlingServiceDefaults<TBuilder>(this TBuilder builder)
        where TBuilder : IHostApplicationBuilder
    {
        return builder;
    }
}
