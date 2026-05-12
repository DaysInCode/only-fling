[CmdletBinding()]
param(
  [string]$Repository = "DaysInCode/only-fling",
  [string]$Workflow,
  [string]$Branch = "main",
  [int]$Limit = 10,
  [string]$RunId,
  [switch]$FollowLatest,
  [switch]$DryRun
)

. (Join-Path $PSScriptRoot "tooling-common.ps1")

if ($DryRun) {
  Write-Host "Dry run: would query GitHub Actions runs for $Repository"
  exit 0
}

Assert-ToolCommand -Name "gh"

Write-ToolSection -Message "GitHub Actions monitor"

if ($RunId) {
  & gh run view $RunId --repo $Repository
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to inspect run $RunId in $Repository."
  }

  if ($FollowLatest) {
    & gh run watch $RunId --repo $Repository --interval 10
  }

  exit $LASTEXITCODE
}

$listArguments = @("run", "list", "--repo", $Repository, "--limit", $Limit, "--json", "databaseId,workflowName,headBranch,status,conclusion,displayTitle,url,createdAt")
if ($Workflow) {
  $listArguments += @("--workflow", $Workflow)
}

$rawRuns = & gh @listArguments
if ($LASTEXITCODE -ne 0) {
  throw "Unable to list GitHub Actions runs for $Repository."
}

$runs = @($rawRuns | ConvertFrom-Json)
if ($Branch) {
  $runs = @($runs | Where-Object { $_.headBranch -eq $Branch })
}

if (-not $runs.Count) {
  Write-Host "No runs found."
  exit 0
}

$runs |
  Select-Object databaseId, workflowName, headBranch, status, conclusion, createdAt, url |
  Format-Table -AutoSize |
  Out-Host

if ($FollowLatest) {
  $latestRun = $runs | Select-Object -First 1
  & gh run watch $latestRun.databaseId --repo $Repository --interval 10
}
