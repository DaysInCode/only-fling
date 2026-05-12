namespace OnlyFling.Api.Core;

public sealed class ModuleCatalogService(AppConfiguration configuration, AppRepository repository)
{
    public async Task<object> GetConnectorCatalogAsync(SessionRecord? session)
    {
        UserProfile? user = null;
        VerificationReadiness? readiness = null;
        List<PreviewEnrollment> enrollments = [];
        if (session is not null)
        {
            user = await repository.GetOrCreateUserAsync(session.Email);
            readiness = await repository.GetVerificationReadinessAsync(user);
            enrollments = await repository.ListPreviewEnrollmentsAsync(user.Id);
        }

        var moduleSeeds = await repository.ListModuleDefinitionsAsync();
        var modules = moduleSeeds.Select(module => ResolveModule(module, user, readiness, enrollments)).ToList();
        var connectorSeeds = await repository.ListConnectorDefinitionsAsync();
        var connectors = connectorSeeds.Select(connector =>
        {
            var relevant = modules.Where(module => module.ConnectorId == connector.Id).ToList();
            var clone = Clone(connector);
            clone.Eligibility = relevant.Any(module => module.Eligibility.Allowed)
                ? relevant.OrderByDescending(module => module.Eligibility.Allowed).ThenBy(module => module.Eligibility.MinimumAccountAgeDays).First().Eligibility
                : relevant.FirstOrDefault()?.Eligibility ?? new ModuleEligibility { Allowed = true, EffectiveChannel = "stable", EffectiveRoute = connector.Id == "stripe" ? "/account/wallet" : "/connectors" };
            return clone;
        }).ToList();

        return new
        {
            connectors,
            modules,
            ring = configuration.DeploymentRing,
            preview = new
            {
                serverSideEnrollment = true,
                requiresCanaryRing = true,
                activeRing = configuration.DeploymentRing,
            },
        };
    }

    public async Task<(PreviewEnrollment? Enrollment, string? Error)> EnrollAsync(SessionRecord session, string moduleId)
    {
        var module = (await repository.ListModuleDefinitionsAsync()).FirstOrDefault(entry => entry.Id == moduleId);
        if (module is null)
        {
            return (null, "module-not-found");
        }

        var user = await repository.GetOrCreateUserAsync(session.Email);
        var readiness = await repository.GetVerificationReadinessAsync(user);
        var resolved = ResolveModule(module, user, readiness, await repository.ListPreviewEnrollmentsAsync(user.Id));
        if (resolved.Eligibility.MinimumAccountAgeDays > resolved.Eligibility.CurrentAccountAgeDays)
        {
            return (null, "account-age-restricted");
        }
        if (resolved.Eligibility.RequiresVerifiedIdentity && readiness.IdentityStatus != "verified")
        {
            return (null, "identity-verification-required");
        }
        if (resolved.Eligibility.RequiresConsentReadiness && readiness.ConsentStatus == "missing")
        {
            return (null, "consent-readiness-required");
        }

        var enrollment = await repository.SavePreviewEnrollmentAsync(user.Id, moduleId);
        return (enrollment, null);
    }

    private AppModule ResolveModule(AppModule source, UserProfile? user, VerificationReadiness? readiness, List<PreviewEnrollment> enrollments)
    {
        var module = Clone(source);
        var accountAgeDays = user is null ? 0 : Math.Max(0, (int)Math.Floor((DateTimeOffset.UtcNow - DateTimeOffset.Parse(user.CreatedAt)).TotalDays));
        var enrollment = user is null ? null : enrollments.FirstOrDefault(entry => entry.ModuleId == module.Id);
        var identityOk = !module.RequiresVerifiedIdentity || readiness?.IdentityStatus == "verified";
        var consentOk = !module.RequiresConsentReadiness || readiness?.ConsentStatus == "complete";
        var ageOk = accountAgeDays >= module.MinimumAccountAgeDays;
        var canaryNeeded = module.PreviewOnly || !string.IsNullOrWhiteSpace(module.PreviewRoute);
        var previewActive = enrollment is not null && string.Equals(configuration.DeploymentRing, "canary", StringComparison.OrdinalIgnoreCase);
        var allowed = ageOk && identityOk && consentOk && (!module.PreviewOnly || previewActive);
        var reason = !ageOk ? "account-age-restricted" : !identityOk ? "identity-verification-required" : !consentOk ? "consent-readiness-required" : module.PreviewOnly && enrollment is null ? "preview-enrollment-required" : module.PreviewOnly && !previewActive ? "canary-ring-required" : null;
        module.Enrollment = enrollment;
        module.Eligibility = new ModuleEligibility
        {
            Allowed = allowed || (!module.PreviewOnly && ageOk && identityOk && consentOk),
            CurrentAccountAgeDays = accountAgeDays,
            MinimumAccountAgeDays = module.MinimumAccountAgeDays,
            RequiresVerifiedIdentity = module.RequiresVerifiedIdentity,
            RequiresConsentReadiness = module.RequiresConsentReadiness,
            RequiresCanaryRing = canaryNeeded,
            RequiresPreviewEnrollment = module.PreviewOnly || module.PreviewRoute is not null,
            EffectiveChannel = previewActive ? "preview" : allowed ? module.DefaultChannel : "disabled",
            EffectiveRoute = previewActive && !string.IsNullOrWhiteSpace(module.PreviewRoute) ? module.PreviewRoute : allowed || (!module.PreviewOnly && ageOk && identityOk && consentOk) ? module.StableRoute : null,
            Reason = reason,
        };
        return module;
    }

    private static T Clone<T>(T value)
        => System.Text.Json.JsonSerializer.Deserialize<T>(System.Text.Json.JsonSerializer.Serialize(value))!;
}
