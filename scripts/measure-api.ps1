[CmdletBinding()]
param(
  [string]$BaseUrl = "http://127.0.0.1:7071/api",
  [string]$Path = "/health",
  [int]$Samples = 8,
  [int]$DelayMilliseconds = 200,
  [int]$TimeoutSec = 15,
  [int]$AcceptableP95Ms = 3000,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

$url = "$($BaseUrl.TrimEnd('/'))/$($Path.TrimStart('/'))"

if ($DryRun) {
  Write-Host "Dry run: would measure $Samples samples against $url"
  exit 0
}

Write-ToolSection -Message "API latency validation"
$measurement = Measure-Url -Url $url -Samples $Samples -DelayMilliseconds $DelayMilliseconds -TimeoutSec $TimeoutSec

$summary = [pscustomobject]@{
  url          = $measurement.Url
  samples      = $measurement.Samples
  successCount = $measurement.SuccessCount
  failureCount = $measurement.FailureCount
  averageMs    = $measurement.AverageMs
  minMs        = $measurement.MinMs
  maxMs        = $measurement.MaxMs
  p50Ms        = $measurement.P50Ms
  p95Ms        = $measurement.P95Ms
  statusCodes  = $measurement.StatusCodes
}

$summary | Format-List | Out-Host

if ($measurement.FailureCount -gt 0) {
  throw "API performance validation failed because $($measurement.FailureCount) requests did not return success."
}

if ($AcceptableP95Ms -gt 0 -and $measurement.P95Ms -gt $AcceptableP95Ms) {
  throw "API performance validation failed because p95 latency $($measurement.P95Ms)ms exceeded $AcceptableP95Ms ms."
}
