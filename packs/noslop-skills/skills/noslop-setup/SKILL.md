---
name: "noslop-setup"
description: "Install and configure noslop quality gates in an existing repository, including git hooks, CI workflows, and Claude Code guardrails."
---

Use this skill when setting up noslop in a repository for the first time or verifying an existing install.

Installation:

- install noslop globally: `npm install -g @45ck/noslop`
- go to the target repo root (must be an existing git repo)
- run `noslop init` — detects language pack, copies templates, wires git hooks via `git config core.hooksPath .githooks`
- run `noslop doctor` to confirm all enforcement layers are present

What gets installed:

- `.githooks/pre-commit` — runs `noslop check --tier=fast` before every commit
- `.githooks/pre-push` — runs `noslop check --tier=slow` before every push
- `.githooks/commit-msg` — rejects CI-bypass patterns and enforces Conventional Commits
- `.github/workflows/quality.yml` — required CI check on every PR and push to main
- `.github/workflows/guardrails.yml` — blocks PRs touching protected files without `noslop-approved` label
- `.claude/settings.json` — denies `--no-verify`, `--force`, and edits to protected paths
- `.claude/hooks/pre-tool-use.sh` — intercepts every Claude Code tool call, blocks bypass patterns
- `AGENTS.md` — plain-language rules for AI agents working in the repo

Configuring AGENTS.md rules:

The generated `AGENTS.md` must state:
- run `noslop check --tier=fast` before every commit
- run `noslop check --tier=slow` before opening a PR
- never use `git commit --no-verify`
- never use `git push --force` without explicit human approval
- never use `[skip ci]`, `skip-checks`, or `SKIP_CI`
- do not weaken quality gates in `.githooks/`, `.github/workflows/`, or `.claude/hooks/`
- additive changes to infrastructure files are allowed; removal or weakening is not

Two-tier check system:

- `--tier=fast` — format, lint, spell check; must complete in seconds; runs on every commit
- `--tier=slow` — type checking and full test suite; runs before every push and before opening a PR
- `--tier=ci` — full pipeline; authoritative; cannot be skipped by any local trick

Verify setup:

```sh
noslop doctor
```

Expected healthy output confirms: hooks present and executable, `core.hooksPath` set, CI workflow files present, Claude settings and hook present.

For multi-pack repos, pass `--pack` repeatedly: `noslop init --pack typescript --pack python`.
