# Integration Testing

Integration tests verify interaction between components or infrastructure.

Use integration tests when correctness depends on:

- database
- EF Core
- HTTP
- ASP.NET Core pipeline
- authentication
- serialization
- filesystem
- message broker
- external service integration

Do not replace integration behavior with mocks when the integration itself
is what needs to be verified.

Prefer realistic infrastructure where practical.
