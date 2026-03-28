# Repo Placement

The right model is not full duplication everywhere.

## Recommendation

- Keep `skill-harness` as the canonical source of truth for shared workflow agents and install tooling.
- Keep the skill-pack repos as the canonical source of truth for reusable skills.
- Do not copy the full 13-agent roster into every individual pack repo.

## Why

- The agents are cross-pack compositions, so most of them do not belong cleanly to a single pack repo.
- Duplicating full agent definitions across pack repos creates version drift, especially once loadouts change.
- A central harness repo makes dependency management, install flows, and harness-specific formats easier to maintain.

## What to allow in individual pack repos

- Lightweight references in the README to relevant workflow agents.
- Optional pack-local specialist agents only when they are genuinely pack-specific.
- Example: a narrowly scoped `security-threat-modeler` inside `security-engineering-skills` could make sense, but the full shared roster should stay centralized.

## Practical rule

- Shared multi-pack workflow agents: keep in `skill-harness`.
- Pack-specific helper agents: allow in the individual repo if they only depend on that repo or that repo plus one tightly related pack.
- If an agent starts depending on three or more packs, move it to `skill-harness`.

## Current decision

For the current roster, `skill-harness` should remain the main home. Individual pack repos should link to it rather than duplicate it.
