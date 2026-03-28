$Agents = @($args)
$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$claudeTarget = Join-Path $HOME '.claude\agents'
$codexTarget = Join-Path $HOME '.codex\agents'
python (Join-Path $scriptDir 'scripts\bootstrap_dependencies.py') @Agents
New-Item -ItemType Directory -Force -Path $claudeTarget | Out-Null
New-Item -ItemType Directory -Force -Path $codexTarget | Out-Null
if ($Agents.Count -eq 0) {
  Copy-Item -Path (Join-Path $scriptDir '.claude\agents\*.md') -Destination $claudeTarget -Force
} else {
  foreach ($agent in $Agents) {
    Copy-Item -Path (Join-Path $scriptDir ".claude\agents\$agent.md") -Destination (Join-Path $claudeTarget "$agent.md") -Force
  }
}
python (Join-Path $scriptDir 'scripts\render_codex_agents.py') @Agents
python (Join-Path $scriptDir 'scripts\check_dependencies.py') @Agents
Write-Output "Installed Claude agents to $claudeTarget"
Write-Output "Rendered Codex agents to $codexTarget"
