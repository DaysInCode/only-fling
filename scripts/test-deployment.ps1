[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$WebUrl,
  [Parameter(Mandatory)]
  [string]$ApiBaseUrl,
  [string[]]$WebPaths = @("/"),
  [string]$ExpectedText = "OnlyFling",
  [int]$TimeoutSec = 20,
  [int]$ApiSampleCount = 5,
  [int]$AcceptableApiP95Ms = 3000,
  [string]$MeasurementId,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

$normalizedWebUrl = $WebUrl.TrimEnd("/")
$normalizedApiBaseUrl = $ApiBaseUrl.TrimEnd("/")

if ($DryRun) {
  Write-Host "Dry run: would probe $normalizedWebUrl and $normalizedApiBaseUrl"
  exit 0
}

Write-ToolSection -Message "Deployment smoke validation"

$webResults = foreach ($path in $WebPaths) {
  $fullUrl = if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
    $normalizedWebUrl
  } else {
    "$normalizedWebUrl/$($path.TrimStart('/'))"
  }

  $probe = Invoke-UrlProbe -Url $fullUrl -TimeoutSec $TimeoutSec
  if (-not $probe.Ok -or $probe.StatusCode -lt 200 -or $probe.StatusCode -ge 400) {
    throw "Web smoke check failed for $fullUrl. $($probe.ErrorMessage)"
  }

  $title = $null
  if ($probe.Content -match "<title>(?<title>[^<]+)</title>") {
    $title = $matches.title
  }

  if ($ExpectedText -and $probe.Content -notmatch [regex]::Escape($ExpectedText)) {
    throw "Web smoke check failed for $fullUrl because expected text '$ExpectedText' was not found."
  }

  [pscustomobject]@{
    url        = $fullUrl
    statusCode = $probe.StatusCode
    durationMs = $probe.DurationMs
    title      = $title
  }
}

$apiHealthProbe = Invoke-UrlProbe -Url "$normalizedApiBaseUrl/health" -TimeoutSec $TimeoutSec
if (-not $apiHealthProbe.Ok -or $apiHealthProbe.StatusCode -lt 200 -or $apiHealthProbe.StatusCode -ge 400) {
  throw "API smoke check failed for $normalizedApiBaseUrl/health. $($apiHealthProbe.ErrorMessage)"
}

$apiHealth = $apiHealthProbe.Content | ConvertFrom-Json
if ($apiHealth.status -ne "ok") {
  throw "API health endpoint returned status '$($apiHealth.status)'."
}

$apiMetrics = Measure-Url -Url "$normalizedApiBaseUrl/health" -Samples $ApiSampleCount -TimeoutSec $TimeoutSec

if ($apiMetrics.FailureCount -gt 0) {
  throw "API smoke check recorded $($apiMetrics.FailureCount) failed samples."
}

if ($AcceptableApiP95Ms -gt 0 -and $apiMetrics.P95Ms -gt $AcceptableApiP95Ms) {
  throw "API smoke check p95 latency $($apiMetrics.P95Ms)ms exceeded $AcceptableApiP95Ms ms."
}

$analyticsTagDetected = $false
if ($MeasurementId) {
  $rootContent = ($webResults | Select-Object -First 1).url
  $rootProbe = Invoke-UrlProbe -Url $rootContent -TimeoutSec $TimeoutSec
  $analyticsTagDetected = $rootProbe.Content -match [regex]::Escape($MeasurementId)
}

$summary = [pscustomobject]@{
  webChecks = $webResults
  apiHealth = [pscustomobject]@{
    status            = $apiHealth.status
    timestamp         = $apiHealth.timestamp
    platformFee       = $apiHealth.platformFeePercent
    storageConfigured = $apiHealth.storageConfigured
    deploymentRing    = $apiHealth.deploymentRing
  }
  apiLatency = [pscustomobject]@{
    samples     = $apiMetrics.Samples
    averageMs   = $apiMetrics.AverageMs
    p50Ms       = $apiMetrics.P50Ms
    p95Ms       = $apiMetrics.P95Ms
    statusCodes = $apiMetrics.StatusCodes
  }
  analyticsTagDetected = $analyticsTagDetected
}

$summary | ConvertTo-Json -Depth 6 | Write-Host
