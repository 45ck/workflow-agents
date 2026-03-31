---
name: "noslop-pr-gate"
description: "Run the noslop pre-PR quality gate and handle the noslop-approved escape hatch for intentional config weakening before opening a pull request."
---

Use this skill before opening or updating a pull request in a noslop-protected repository.

Gate command:

```sh
noslop check --tier=slow
```

Run this after all commits are staged and before opening the PR. This tier runs type checking and the full test suite. The pre-push hook runs it automatically before `git push`, but running it manually first avoids a rejected push.

If the gate fails:

- fix the type error or test failure reported in the output
- never use `[skip ci]`, `skip-checks`, or `SKIP_CI` in commit messages or CI configuration
- never add `continue-on-error: true` to workflow steps to force a green CI run
- re-run `noslop check --tier=slow` to confirm the gate is green before pushing

Escape hatch for intentional weakening:

If a change intentionally weakens a quality gate config (for example, removing an obsolete lint rule), the pre-commit hook will block it locally. To proceed:

1. submit the change via a pull request
2. have a human reviewer apply the `noslop-approved` label to the PR
3. `guardrails.yml` enforces the label requirement; the PR cannot merge without it

This escape hatch is for deliberate, reviewed decisions only. Do not use it to unblock failing gates. Do not apply the label yourself.

Protected files requiring the label:

- `.githooks/`
- `.github/workflows/`
- `.claude/settings.json`
- `.claude/hooks/`

Any PR that modifies these paths without the `noslop-approved` label will be blocked by the guardrails CI check.

CI is authoritative:

The `quality.yml` workflow runs `--tier=ci` (all tiers combined) on every PR and every push to `main`. It is configured as a required status check. Bypassing local hooks does not bypass CI. The CI tier is the final gate and cannot be skipped by any local trick.

Checklist before opening a PR:

- `noslop check --tier=slow` passes locally
- no `[skip ci]`, `SKIP_CI`, or `skip-checks` in commit messages
- no `continue-on-error: true` added to workflows
- if protected files are modified, the `noslop-approved` label has been applied by a human reviewer

Avoid:

- pushing with `--force` without explicit human approval
- adding CI-bypass patterns to get a failing check to pass
- requesting or applying the `noslop-approved` label without a human reviewer's explicit decision
