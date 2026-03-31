#!/usr/bin/env bash
# Usage: ./experiments/run-session.sh [a|b] <session-name>
#
# Creates experiments/sessions/<group>-<session-name>/ with the right setup
# for a toolkit vs baseline benchmark session.
#
# Group a: copies group-a-setup.md as SETUP.md and seeds an AGENTS.md stub
# Group b: copies group-b-setup.md as SETUP.md; no additional files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SESSIONS_DIR="${SCRIPT_DIR}/sessions"

# --- argument validation ---

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 [a|b] <session-name>" >&2
  exit 1
fi

GROUP="${1,,}"  # lowercase
SESSION_NAME="$2"

if [[ "$GROUP" != "a" && "$GROUP" != "b" ]]; then
  echo "Error: group must be 'a' or 'b', got '${GROUP}'" >&2
  exit 1
fi

if [[ -z "$SESSION_NAME" ]]; then
  echo "Error: session-name must not be empty" >&2
  exit 1
fi

SESSION_DIR="${SESSIONS_DIR}/${GROUP}-${SESSION_NAME}"

if [[ -d "$SESSION_DIR" ]]; then
  echo "Error: session directory already exists: ${SESSION_DIR}" >&2
  exit 1
fi

# --- create directory ---

mkdir -p "$SESSION_DIR"

# --- copy setup guide ---

cp "${SCRIPT_DIR}/group-${GROUP}-setup.md" "${SESSION_DIR}/SETUP.md"

# --- copy task prompt ---

cp "${SCRIPT_DIR}/session-task.md" "${SESSION_DIR}/SESSION_TASK.md"

# --- group-specific extras ---

if [[ "$GROUP" == "a" ]]; then
  # Seed the AGENTS.md that group-a-setup.md instructs the reviewer to create.
  # The agent will see this when Claude Code opens the directory.
  cat > "${SESSION_DIR}/AGENTS.md" << 'EOF'
# Agent instructions

This project uses specgraph for spec tracking and noslop for quality gates.

## Before writing any code

1. Run `/spec-writer` to create a spec document in `docs/` for the feature you are implementing.
2. Confirm the spec is committed before proceeding.

## While writing code

3. Annotate every source file with `@spec` and `@implements` JSDoc tags using `/annotation-writer`.
4. Run `npx specgraph verify` after each significant change and review output with `/verify-interpreter`.

## Before committing

5. Run `/noslop-commit-gate` and resolve all failures before committing.
6. Run `npx specgraph verify` one final time. All requirements must have E1 or higher evidence.

## If a requirement cannot be satisfied

Use `/waiver-writer` to write a justified waiver with an expiry date.
EOF

  echo "Created Group A session: ${SESSION_DIR}"
  echo ""
  echo "Next steps:"
  echo "  1. Follow the instructions in ${SESSION_DIR}/SETUP.md"
  echo "  2. Run 'npm init -y && npm install @45ck/agent-docs @45ck/noslop' inside the session directory"
  echo "  3. Run 'npx noslop install' to set up quality gates"
  echo "  4. Install skill packs: ./skill-harness install --packs specgraph-skills noslop-skills --packs-only"
  echo "  5. Open a fresh Claude Code conversation in ${SESSION_DIR}"
  echo "  6. Paste the task prompt from SESSION_TASK.md as the first message"

else
  echo "Created Group B session: ${SESSION_DIR}"
  echo ""
  echo "Next steps:"
  echo "  1. Review ${SESSION_DIR}/SETUP.md for baseline conditions"
  echo "  2. Confirm no AGENTS.md, no specgraph, no noslop are present"
  echo "  3. If skill packs are installed globally, temporarily move them: mv ~/.claude/skills ~/.claude/skills.bak"
  echo "  4. Open a fresh Claude Code conversation in ${SESSION_DIR}"
  echo "  5. Paste the task prompt from SESSION_TASK.md as the first message"
  echo "  6. After scoring, restore skills if moved: mv ~/.claude/skills.bak ~/.claude/skills"
fi
