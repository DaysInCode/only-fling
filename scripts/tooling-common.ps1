Set-StrictMode -Version Latest

$script:RepoRoot = Split-Path -Parent $PSScriptRoot

function Get-RepoRoot {
  return $script:RepoRoot
}

function Resolve-RepoPath {
  param(
    [Parameter(Mandatory)]
    [string]$RelativePath
  )

  return Join-Path $script:RepoRoot $RelativePath
}

function Write-ToolSection {
  param(
    [Parameter(Mandatory)]
    [string]$Message
  )

  Write-Host ""
  Write-Host "== $Message ==" -ForegroundColor Cyan
}

function Test-ToolCommand {
  param(
    [Parameter(Mandatory)]
    [string]$Name
  )

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Assert-ToolCommand {
  param(
    [Parameter(Mandatory)]
    [string]$Name
  )

  if (-not (Test-ToolCommand -Name $Name)) {
    throw "Required command '$Name' is not available on PATH."
  }
}

function Get-ShellExecutable {
  if (Test-ToolCommand -Name "pwsh") {
    return (Get-Command pwsh).Source
  }

  return (Get-Command powershell).Source
}

function Get-WebRequestParameters {
  param(
    [Parameter(Mandatory)]
    [string]$Url,
    [ValidateSet("Get", "Post")]
    [string]$Method = "Get",
    [int]$TimeoutSec = 15,
    [hashtable]$Headers = @{},
    [string]$ContentType,
    [string]$Body
  )

  $params = @{
    Uri         = $Url
    Method      = $Method
    TimeoutSec  = $TimeoutSec
    Headers     = $Headers
    ErrorAction = "Stop"
  }

  if ($ContentType) {
    $params.ContentType = $ContentType
  }

  if ($PSBoundParameters.ContainsKey("Body")) {
    $params.Body = $Body
  }

  if ((Get-Command Invoke-WebRequest).Parameters.ContainsKey("UseBasicParsing")) {
    $params.UseBasicParsing = $true
  }

  return $params
}

function Invoke-UrlProbe {
  param(
    [Parameter(Mandatory)]
    [string]$Url,
    [ValidateSet("Get", "Post")]
    [string]$Method = "Get",
    [int]$TimeoutSec = 15,
    [hashtable]$Headers = @{},
    [string]$ContentType,
    [string]$Body
  )

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

  try {
    $requestParameters = Get-WebRequestParameters -Url $Url -Method $Method -TimeoutSec $TimeoutSec -Headers $Headers -ContentType $ContentType -Body $Body
    $response = Invoke-WebRequest @requestParameters
    $stopwatch.Stop()

    return [pscustomobject]@{
      Url          = $Url
      Ok           = $true
      StatusCode   = [int]$response.StatusCode
      DurationMs   = [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2)
      Content      = $response.Content
      Headers      = $response.Headers
      ErrorMessage = $null
    }
  } catch {
    $stopwatch.Stop()

    $statusCode = $null
    if (
      $_.Exception.PSObject.Properties.Name -contains "Response" -and
      $_.Exception.Response -and
      $_.Exception.Response.PSObject.Properties.Name -contains "StatusCode" -and
      $_.Exception.Response.StatusCode
    ) {
      $statusCode = [int]$_.Exception.Response.StatusCode
    }

    return [pscustomobject]@{
      Url          = $Url
      Ok           = $false
      StatusCode   = $statusCode
      DurationMs   = [math]::Round($stopwatch.Elapsed.TotalMilliseconds, 2)
      Content      = $null
      Headers      = $null
      ErrorMessage = $_.Exception.Message
    }
  }
}

function Wait-ForUrl {
  param(
    [Parameter(Mandatory)]
    [string]$Url,
    [int]$TimeoutSeconds = 180,
    [int]$DelaySeconds = 2
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  while ((Get-Date) -lt $deadline) {
    $probe = Invoke-UrlProbe -Url $Url
    if ($probe.Ok -and $probe.StatusCode -ge 200 -and $probe.StatusCode -lt 400) {
      return $probe
    }

    Start-Sleep -Seconds $DelaySeconds
  }

  throw "Timed out waiting for $Url"
}

function Get-Percentile {
  param(
    [Parameter(Mandatory)]
    [double[]]$Values,
    [ValidateRange(0, 100)]
    [double]$Percentile
  )

  if ($Values.Count -eq 0) {
    return 0
  }

  $sorted = $Values | Sort-Object
  $index = [math]::Ceiling(($Percentile / 100) * $sorted.Count) - 1
  $index = [Math]::Max(0, [Math]::Min($index, $sorted.Count - 1))
  return [math]::Round($sorted[$index], 2)
}

function Measure-Url {
  param(
    [Parameter(Mandatory)]
    [string]$Url,
    [int]$Samples = 5,
    [int]$DelayMilliseconds = 200,
    [int]$TimeoutSec = 15,
    [hashtable]$Headers = @{}
  )

  $results = @()

  for ($index = 1; $index -le $Samples; $index++) {
    $probe = Invoke-UrlProbe -Url $Url -TimeoutSec $TimeoutSec -Headers $Headers
    $results += $probe
    if ($index -lt $Samples -and $DelayMilliseconds -gt 0) {
      Start-Sleep -Milliseconds $DelayMilliseconds
    }
  }

  $successes = @($results | Where-Object { $_.Ok -and $_.StatusCode -ge 200 -and $_.StatusCode -lt 400 })
  $durations = @($successes | ForEach-Object { [double]$_.DurationMs })

  return [pscustomobject]@{
    Url          = $Url
    Samples      = $Samples
    SuccessCount = $successes.Count
    FailureCount = $Samples - $successes.Count
    AverageMs    = if ($durations.Count) { [math]::Round((($durations | Measure-Object -Average).Average), 2) } else { 0 }
    MinMs        = if ($durations.Count) { [math]::Round((($durations | Measure-Object -Minimum).Minimum), 2) } else { 0 }
    MaxMs        = if ($durations.Count) { [math]::Round((($durations | Measure-Object -Maximum).Maximum), 2) } else { 0 }
    P50Ms        = if ($durations.Count) { Get-Percentile -Values $durations -Percentile 50 } else { 0 }
    P95Ms        = if ($durations.Count) { Get-Percentile -Values $durations -Percentile 95 } else { 0 }
    StatusCodes  = (($results | ForEach-Object { if ($_.StatusCode) { [string]$_.StatusCode } else { "error" } }) -join ",")
    Results      = $results
  }
}

function New-LogFilePath {
  param(
    [Parameter(Mandatory)]
    [string]$Name
  )

  $logDirectory = Resolve-RepoPath -RelativePath "scripts\logs"
  if (-not (Test-Path $logDirectory)) {
    New-Item -ItemType Directory -Path $logDirectory | Out-Null
  }

  return Join-Path $logDirectory "$Name.log"
}

function Start-ManagedProcess {
  param(
    [Parameter(Mandatory)]
    [string]$Name,
    [Parameter(Mandatory)]
    [string]$Command,
    [Parameter(Mandatory)]
    [string]$WorkingDirectory
  )

  $shell = Get-ShellExecutable
  $stdout = New-LogFilePath -Name $Name
  $stderr = New-LogFilePath -Name "$Name.error"
  $arguments = @("-NoLogo", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", $Command)

  $process = Start-Process -FilePath $shell -ArgumentList $arguments -WorkingDirectory $WorkingDirectory -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden

  return [pscustomobject]@{
    Name       = $Name
    Process    = $process
    OutputLog  = $stdout
    ErrorLog   = $stderr
    Command    = $Command
  }
}

function Stop-ManagedProcesses {
  param(
    [Parameter(Mandatory)]
    [object[]]$Processes
  )

  foreach ($entry in $Processes) {
    if ($entry.Process -and -not $entry.Process.HasExited) {
      Stop-Process -Id $entry.Process.Id
    }
  }
}

function Get-ComposeServiceNames {
  param(
    [Parameter(Mandatory)]
    [string]$ComposeFile
  )

  if (-not (Test-Path $ComposeFile)) {
    return @()
  }

  $content = Get-Content $ComposeFile -Raw
  $matches = [regex]::Matches($content, "(?m)^  ([a-z0-9-]+):\s*$")
  return @($matches | ForEach-Object { $_.Groups[1].Value })
}
