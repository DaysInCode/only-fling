# .NET CLI

Prefer repository-compatible commands.

Common commands include:

dotnet restore

dotnet build

dotnet test

dotnet test --no-build

dotnet run

dotnet format

Before executing a command:

1. Inspect the repository.
2. Determine the appropriate solution/project.
3. Check whether repository scripts define a preferred command.

Do not assume every repository should use the same command-line arguments.
