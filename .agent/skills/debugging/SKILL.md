---
name: debugging
description: >
  Systematic debugging workflow for diagnosing failing tests,
  runtime errors, unexpected behavior, build failures, and defects
  in .NET applications.
---

# Debugging

Debugging is an investigation, not trial-and-error editing.

## Workflow

    OBSERVE
       ↓
    REPRODUCE
       ↓
    ISOLATE
       ↓
    HYPOTHESIZE
       ↓
    TEST HYPOTHESIS
       ↓
    FIX ROOT CAUSE
       ↓
    REGRESSION TEST
       ↓
    VALIDATE

## Observe

Collect:

- error messages
- stack traces
- failing tests
- logs
- inputs
- expected behavior
- actual behavior

Do not assume the first exception is the root cause.

## Reproduce

Create the smallest reliable reproduction.

Prefer an automated test when possible.

## Isolate

Determine which layer contains the defect:

- domain
- application
- infrastructure
- persistence
- API
- configuration
- environment
- dependency

## Hypothesis

State the most likely cause before making changes.

Then perform a focused experiment.

Do not make many unrelated changes at once.

## Fix

Fix the root cause rather than suppressing the symptom.

## Regression protection

Add a regression test whenever practical.

## Finish

Run:

- regression test
- related tests
- broader validation appropriate to the change

If the defect reveals a weakness in the engineering workflow,
invoke `skill-improvement`.
