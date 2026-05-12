param(
  [string]$ComposeFile = "podman-compose.yml"
)

$ErrorActionPreference = "Stop"

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 180
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  throw "Timed out waiting for $Url"
}

try {
  podman compose -f $ComposeFile down
  podman compose -f $ComposeFile up -d --build azurite api web
  Wait-ForUrl -Url "http://127.0.0.1:7071/api/health"
  Wait-ForUrl -Url "http://127.0.0.1:3000"
  podman compose -f $ComposeFile run --rm cypress
} finally {
  podman compose -f $ComposeFile down
}
