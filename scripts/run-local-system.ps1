[CmdletBinding()]
param(
  [ValidateSet("Dev", "Validate")]
  [string]$Mode = "Dev",
  [ValidateSet("Auto", "Aspire", "Containers", "Processes")]
  [string]$Runtime = "Auto",
  [string]$ComposeFile = (Join-Path (Split-Path -Parent $PSScriptRoot) "podman-compose.yml"),
  [string]$WebUrl = "http://127.0.0.1:3000",
  [string]$ApiBaseUrl = "http://127.0.0.1:7071/api",
  [int]$TimeoutSeconds = 240,
  [switch]$IncludeMobile,
  [switch]$IncludeMcp,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

$repoRoot = Get-RepoRoot
$aspireAppHost = Resolve-RepoPath -RelativePath "aspire\OnlyFling.AppHost\OnlyFling.AppHost.csproj"
$managedProcesses = @()
$containersStarted = $false

function Invoke-LocalValidation {
  & (Join-Path $PSScriptRoot "test-deployment.ps1") -WebUrl $WebUrl -ApiBaseUrl $ApiBaseUrl -ApiSampleCount 5
  & (Join-Path $PSScriptRoot "measure-api.ps1") -BaseUrl $ApiBaseUrl -Path "/health" -Samples 5
}

function Ensure-LocalConfigFiles {
  $apiSettings = Resolve-RepoPath -RelativePath "api\local.settings.json"
  $apiExample = Resolve-RepoPath -RelativePath "api\local.settings.example.json"
  $webEnv = Resolve-RepoPath -RelativePath "web\.env.local"
  $webExample = Resolve-RepoPath -RelativePath "web\.env.local.example"

  if (-not (Test-Path $apiSettings) -and (Test-Path $apiExample)) {
    Copy-Item $apiExample $apiSettings
  }

  if (-not (Test-Path $webEnv) -and (Test-Path $webExample)) {
    Copy-Item $webExample $webEnv
  }
}

function Start-ContainerRuntime {
  Assert-ToolCommand -Name "podman"
  $services = @("azurite", "api", "web")
  if ($mcpAvailable) {
    $services += "mcp"
  }

  & podman compose -f $ComposeFile down *> $null
  $composeArgs = @("compose", "-f", $ComposeFile, "up", "-d", "--build") + $services
  & podman @composeArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Podman compose failed to start the requested services."
  }

  $script:containersStarted = $true
}

function Start-ProcessRuntime {
  Assert-ToolCommand -Name "npm"
  Ensure-LocalConfigFiles

  if ((Test-Path $ComposeFile) -and (Test-ToolCommand -Name "podman")) {
    & podman compose -f $ComposeFile down *> $null
    & podman compose -f $ComposeFile up -d azurite
    if ($LASTEXITCODE -eq 0) {
      $script:containersStarted = $true
    }
  }

  if ($Mode -eq "Validate") {
    & npm --prefix web run build
    if ($LASTEXITCODE -ne 0) {
      throw "Web build failed."
    }

    & npm --prefix api run build
    if ($LASTEXITCODE -ne 0) {
      throw "API build failed."
    }
  }

  $apiCommand = if ($Mode -eq "Validate") { "npm --prefix api run start" } else { "npm --prefix api run dev" }
  $webCommand = if ($Mode -eq "Validate") { "npm --prefix web run start -- --hostname 127.0.0.1 --port 3000" } else { "npm --prefix web run dev -- --hostname 127.0.0.1 --port 3000" }

  $script:managedProcesses += Start-ManagedProcess -Name "tooling-api" -Command $apiCommand -WorkingDirectory $repoRoot
  $script:managedProcesses += Start-ManagedProcess -Name "tooling-web" -Command $webCommand -WorkingDirectory $repoRoot

  if ($mcpAvailable) {
    $script:managedProcesses += Start-ManagedProcess -Name "tooling-mcp" -Command "npm --prefix mcp run dev" -WorkingDirectory $repoRoot
  }

  if ($IncludeMobile) {
    if ($Mode -eq "Validate") {
      & npm --prefix mobile run typecheck
      if ($LASTEXITCODE -ne 0) {
        throw "Mobile typecheck failed."
      }
    } else {
      Write-Warning "Mobile startup is intentionally not automated here because Expo is interactive. Run 'npm --prefix mobile run start' in a separate terminal if needed."
    }
  }
}

function Start-AspireRuntime {
  Assert-ToolCommand -Name "dotnet"
  Assert-ToolCommand -Name "npm"
  Ensure-LocalConfigFiles

  if (-not (Test-Path $aspireAppHost)) {
    throw "Aspire AppHost project not found at $aspireAppHost"
  }

  if ($Mode -eq "Validate") {
    & dotnet build $aspireAppHost --nologo
    if ($LASTEXITCODE -ne 0) {
      throw "Aspire AppHost build failed."
    }
  }

  $aspireCommand = "dotnet run --project `"$aspireAppHost`" --no-launch-profile"
  $script:managedProcesses += Start-ManagedProcess -Name "tooling-aspire" -Command $aspireCommand -WorkingDirectory $repoRoot
}

$effectiveRuntime = $Runtime
if ($Runtime -eq "Auto") {
  if ((Test-Path $aspireAppHost) -and (Test-ToolCommand -Name "dotnet") -and (Test-ToolCommand -Name "npm")) {
    $effectiveRuntime = "Aspire"
  } elseif ((Test-Path $ComposeFile) -and (Test-ToolCommand -Name "podman")) {
    $effectiveRuntime = "Containers"
  } else {
    $effectiveRuntime = "Processes"
  }
}

$composeServices = Get-ComposeServiceNames -ComposeFile $ComposeFile
$mcpAvailable = $IncludeMcp -and ("mcp" -in $composeServices -or (Test-Path (Resolve-RepoPath -RelativePath "mcp\package.json")))

if ($DryRun) {
  Write-Host "Dry run: mode=$Mode runtime=$effectiveRuntime web=$WebUrl api=$ApiBaseUrl includeMcp=$mcpAvailable includeMobile=$IncludeMobile"
  exit 0
}

try {
  Write-ToolSection -Message "Launching local system ($effectiveRuntime)"

  switch ($effectiveRuntime) {
    "Aspire" {
      try {
        Start-AspireRuntime
      } catch {
        if ($Runtime -ne "Auto") {
          throw
        }

        Write-Warning "Aspire startup failed. Falling back to local processes. $($_.Exception.Message)"
        $effectiveRuntime = "Processes"
        Start-ProcessRuntime
      }
    }
    "Containers" {
      try {
        Start-ContainerRuntime
      } catch {
        if ($Runtime -ne "Auto") {
          throw
        }

        Write-Warning "Container startup failed. Falling back to local processes. $($_.Exception.Message)"
        $effectiveRuntime = "Processes"
        Start-ProcessRuntime
      }
    }
    "Processes" { Start-ProcessRuntime }
  }

  Wait-ForUrl -Url "$($ApiBaseUrl.TrimEnd('/'))/health" -TimeoutSeconds $TimeoutSeconds | Out-Null
  Wait-ForUrl -Url $WebUrl -TimeoutSeconds $TimeoutSeconds | Out-Null

  Invoke-LocalValidation

  if ($Mode -eq "Dev") {
    Write-Host ""
    Write-Host "Local system is ready:" -ForegroundColor Green
    Write-Host "  Web: $WebUrl"
    Write-Host "  API: $ApiBaseUrl"
    if ($mcpAvailable) {
      Write-Host "  MCP: http://127.0.0.1:3100"
    }
    if ($managedProcesses.Count) {
      Write-Host "  Logs: $(Resolve-RepoPath -RelativePath 'scripts\logs')"
    }
  }
} finally {
  if ($Mode -eq "Validate") {
    if ($managedProcesses.Count) {
      Stop-ManagedProcesses -Processes $managedProcesses
    }

    if ($containersStarted) {
      & podman compose -f $ComposeFile down *> $null
    }
  }
}
