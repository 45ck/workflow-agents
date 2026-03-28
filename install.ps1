$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir
try {
  go run ./cmd/skill-harness install @args
} finally {
  Pop-Location
}
