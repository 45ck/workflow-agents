---
name: "noslop-commit-gate"
description: "Run the noslop pre-commit quality gate, interpret failures, and enforce content-aware protection rules before every commit."
---

Use this skill before every `git commit` in a noslop-protected repository.

Gate command:

```sh
noslop check --tier=fast
```

Run this before staging the final commit. The pre-commit hook runs it automatically, but running it manually first surfaces failures early.

If the gate fails:

- read the failure output and fix the reported issue (lint error, format violation, spell error)
- never use `git commit --no-verify` — the Claude Code guardrails block this for AI agents and it defeats the purpose of the gate
- never disable lint rules to make the gate pass; fix the underlying issue
- after fixing, re-run `noslop check --tier=fast` to confirm the gate is green before committing

Content-aware config protection — Tier 1:

The pre-commit hook checks quality gate config files for weakening patterns. Strengthening changes pass through automatically.

| Config | Blocked (weakening) | Allowed (strengthening) |
|---|---|---|
| `eslint.config.mjs` | Adding `'off'` rules, `eslint-disable`, net removal of `'error'` rules | New rules, tighter limits |
| `vitest.config.ts` | Lowering coverage thresholds, removing thresholds | Raising thresholds |
| `tsconfig*.json` | Adding `strict: false`, net removal of strict flags | New strict flags |
| `.dependency-cruiser.cjs` | Net removal of `name:` rules, severity downgrade to warn/info/off | New forbidden rules |
| `knip.json` | Expanding `ignore`/`ignoreDependencies`, `ignoreExportsUsedInFile` | New entry points |

Enforcement file protection — Tier 2a:

Files in `.githooks/`, `.claude/hooks/`, and `AGENTS.md` are the enforcement mechanism itself. The hook only blocks:

- removal of quality commands (`npm run ci`, `npm run test`, `noslop check`, etc.)
- net removal of `exit 1` lines
- net removal of `set -e` lines

Additive changes (new jobs, new checks, new schedules) pass through.

CI and config file protection — Tier 2b:

Files in `.github/workflows/` and `.claude/settings.json` are fully checked:

- removal of quality commands
- addition of bypass patterns (`continue-on-error: true`, `--no-verify`, `[skip ci]`, `SKIP_CI`, `skip-checks`)
- net removal of `exit 1`

Lines containing `deny`, `block`, or `"Bash` are excluded from bypass detection to avoid false positives on enforcement logic.

Avoid:

- using `--no-verify` under any circumstance
- adding `eslint-disable` comments to silence lint failures
- downgrading config severity to pass the gate
- editing `.githooks/`, `.claude/`, or `.github/workflows/` to remove gate commands
