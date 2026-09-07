# Test Strategy

Use the lowest test level that provides meaningful confidence.

Prefer:

    Unit tests
        ↓
    Component tests
        ↓
    Integration tests
        ↓
    End-to-end tests

Do not use end-to-end testing when a unit or integration test can
meaningfully verify the same behavior.

However, do not force unit tests where correctness depends on infrastructure.
