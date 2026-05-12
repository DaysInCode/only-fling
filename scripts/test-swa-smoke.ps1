[CmdletBinding()]
param(
  [Parameter(Mandatory)]
  [string]$WebUrl,
  [string[]]$WebPaths = @("/", "/auth/sign-in/", "/dashboard/"),
  [string]$ExpectedText = "OnlyFling",
  [int]$TimeoutSec = 20,
  [int]$SampleCount = 5,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

$normalizedWebUrl = $WebUrl.TrimEnd("/")

if ($DryRun) {
  Write-Host "Dry run: would probe $normalizedWebUrl"
  exit 0
}

Write-ToolSection -Message "Static Web App smoke validation"

$webChecks = foreach ($path in $WebPaths) {
  $fullUrl = if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
    $normalizedWebUrl
  } else {
    "$normalizedWebUrl/$($path.TrimStart('/'))"
  }

  $probe = Invoke-UrlProbe -Url $fullUrl -TimeoutSec $TimeoutSec
  if (-not $probe.Ok -or $probe.StatusCode -lt 200 -or $probe.StatusCode -ge 400) {
    throw "Web smoke check failed for $fullUrl. $($probe.ErrorMessage)"
  }

  if ($ExpectedText -and $probe.Content -notmatch [regex]::Escape($ExpectedText)) {
    throw "Web smoke check failed for $fullUrl because expected text '$ExpectedText' was not found."
  }

  [pscustomobject]@{
    url        = $fullUrl
    statusCode = $probe.StatusCode
    durationMs = $probe.DurationMs
  }
}

$perf = Measure-Url -Url $normalizedWebUrl -Samples $SampleCount -TimeoutSec $TimeoutSec
if ($perf.FailureCount -gt 0) {
  throw "Static Web App smoke perf probe recorded $($perf.FailureCount) failed samples."
}

$summary = [pscustomobject]@{
  webChecks = $webChecks
  performance = [pscustomobject]@{
    samples   = $perf.Samples
    averageMs = $perf.AverageMs
    p50Ms     = $perf.P50Ms
    p95Ms     = $perf.P95Ms
  }
}

$summary | ConvertTo-Json -Depth 6 | Write-Host
