# noslop-skills

Skills for installing and operating noslop quality gates in any repository.

noslop installs three enforcement layers — git hooks, CI required checks, and Claude Code guardrails — into any existing repo with a single command. It targets teams using Claude Code, Codex CLI, or similar AI coding agents where automated enforcement matters more than developer convenience.

Included skills:

- `noslop-setup` — install and configure noslop in a project
- `noslop-commit-gate` — pre-commit quality gate workflow
- `noslop-pr-gate` — pre-PR quality gate workflow
