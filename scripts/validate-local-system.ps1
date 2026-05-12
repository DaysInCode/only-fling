[CmdletBinding()]
param(
  [ValidateSet("Auto", "Aspire", "Containers", "Processes")]
  [string]$Runtime = "Auto",
  [switch]$IncludeMobile,
  [switch]$IncludeMcp,
  [switch]$DryRun
)

& (Join-Path $PSScriptRoot "run-local-system.ps1") -Mode Validate -Runtime $Runtime -IncludeMobile:$IncludeMobile -IncludeMcp:$IncludeMcp -DryRun:$DryRun
