[CmdletBinding()]
param(
  [string]$MeasurementId = $env:NEXT_PUBLIC_GA_MEASUREMENT_ID,
  [string]$ApiSecret = $env:GA_API_SECRET,
  [string]$ClientId = "555.1234567890",
  [string]$EventName = "tooling_smoke",
  [string]$WebUrl,
  [string]$PayloadPath = (Join-Path $PSScriptRoot "ga-measurement-protocol.example.json"),
  [switch]$ConfigOnly,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

$analyticsSource = Resolve-RepoPath -RelativePath "web\lib\analytics.ts"
$analyticsComponent = Resolve-RepoPath -RelativePath "web\app\google-analytics.tsx"
$exampleEnv = Resolve-RepoPath -RelativePath "web\.env.local.example"

$checks = @(
  @{ Name = "analytics library"; Path = $analyticsSource; Pattern = "NEXT_PUBLIC_GA_MEASUREMENT_ID" },
  @{ Name = "analytics component"; Path = $analyticsComponent; Pattern = "googletagmanager.com/gtag/js" },
  @{ Name = "example env"; Path = $exampleEnv; Pattern = "NEXT_PUBLIC_GA_MEASUREMENT_ID" }
)

Write-ToolSection -Message "GA wiring validation"

foreach ($check in $checks) {
  if (-not (Test-Path $check.Path)) {
    throw "Missing $($check.Name) file at $($check.Path)."
  }

  $content = Get-Content $check.Path -Raw
  if ($content -notmatch [regex]::Escape($check.Pattern)) {
    throw "Expected '$($check.Pattern)' in $($check.Path)."
  }
}

$remoteDetected = $false
if ($WebUrl) {
  $probe = Invoke-UrlProbe -Url $WebUrl -TimeoutSec 20
  if (-not $probe.Ok -or $probe.StatusCode -lt 200 -or $probe.StatusCode -ge 400) {
    throw "Failed to probe $WebUrl. $($probe.ErrorMessage)"
  }

  if ($MeasurementId) {
    $remoteDetected = $probe.Content -match [regex]::Escape($MeasurementId)
  } else {
    $remoteDetected = $probe.Content -match "googletagmanager.com/gtag/js"
  }
}

$payload = $null
if (Test-Path $PayloadPath) {
  $payload = Get-Content $PayloadPath -Raw | ConvertFrom-Json
}

if ($payload -and -not $MeasurementId -and $payload.measurementId) {
  $MeasurementId = $payload.measurementId
}

$requestPayload = if ($payload) {
  $payload.clientId = $ClientId
  $payload.events[0].name = $EventName
  $payload
} else {
  [pscustomobject]@{
    clientId = $ClientId
    events = @(
      @{
        name = $EventName
        params = @{
          engagement_time_msec = 1
          debug_mode = $true
        }
      }
    )
  }
}

if ($DryRun) {
  Write-Host "Dry run: would validate Measurement Protocol payload for measurement id '$MeasurementId'"
  exit 0
}

$debugSummary = [pscustomobject]@{
  measurementId = $MeasurementId
  apiSecretConfigured = [bool]$ApiSecret
  remoteTagDetected = $remoteDetected
  payloadPreview = $requestPayload
}

if (-not $ConfigOnly -and $MeasurementId -and $ApiSecret) {
  $debugUrl = "https://www.google-analytics.com/debug/mp/collect?measurement_id=$MeasurementId&api_secret=$ApiSecret"
  $debugProbe = Invoke-UrlProbe -Url $debugUrl -Method Post -TimeoutSec 20 -ContentType "application/json" -Body ($requestPayload | ConvertTo-Json -Depth 8 -Compress)
  if (-not $debugProbe.Ok -or $debugProbe.StatusCode -lt 200 -or $debugProbe.StatusCode -ge 400) {
    throw "Measurement Protocol debug request failed. $($debugProbe.ErrorMessage)"
  }

  $debugSummary | Add-Member -NotePropertyName debugEndpointStatus -NotePropertyValue $debugProbe.StatusCode
  $debugSummary | Add-Member -NotePropertyName debugEndpointResponse -NotePropertyValue ($debugProbe.Content | ConvertFrom-Json)
} else {
  $debugSummary | Add-Member -NotePropertyName debugEndpointStatus -NotePropertyValue "skipped"
}

$debugSummary | ConvertTo-Json -Depth 8 | Write-Host
