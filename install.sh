#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SELECTED=("$@")
python "$SCRIPT_DIR/scripts/bootstrap_dependencies.py" "${SELECTED[@]}"
mkdir -p "$HOME/.claude/agents" "$HOME/.codex/agents"
if [ "${#SELECTED[@]}" -eq 0 ]; then
  cp "$SCRIPT_DIR"/.claude/agents/*.md "$HOME/.claude/agents/"
else
  for agent in "${SELECTED[@]}"; do
    cp "$SCRIPT_DIR/.claude/agents/$agent.md" "$HOME/.claude/agents/$agent.md"
  done
fi
python "$SCRIPT_DIR/scripts/render_codex_agents.py" "${SELECTED[@]}"
python "$SCRIPT_DIR/scripts/check_dependencies.py" "${SELECTED[@]}"
echo "Installed Claude agents to $HOME/.claude/agents"
echo "Rendered Codex agents to $HOME/.codex/agents"
