# experiments/

This directory contains everything needed to run the toolkit vs baseline benchmark: a head-to-head comparison of AI-assisted software development with and without the full specgraph + noslop + skill-harness toolkit.

## What is being tested

Two groups receive the same task. The only difference is what tools the agent has access to.

- **Group A — full toolkit**: specgraph/agent-docs for spec tracking, noslop for quality gates, and skill-harness skills (specgraph-skills, noslop-skills) loaded into Claude Code.
- **Group B — baseline**: raw Claude Code, no tools installed, no skills, no AGENTS.md.

The hypothesis is that Group A produces measurably better outcomes across spec compliance, evidence quality, output correctness, and disciplined scope management.

## Directory layout

```
experiments/
  README.md             — this file
  methodology.md        — scoring rubric and session format
  session-task.md       — the shared task prompt given to both groups
  group-a-setup.md      — how to configure and start a Group A session
  group-b-setup.md      — how to configure and start a Group B session
  RESULTS.md            — template for recording and comparing results
  run-session.sh        — script to scaffold a session directory for either group
  sessions/             — created at runtime; one subdirectory per session run
```

## How to run a session

1. Read `methodology.md` to understand the scoring rubric.
2. Read `session-task.md` to understand the task both groups will perform.
3. Choose a group (`a` or `b`) and a session name, then scaffold the session:

```bash
./experiments/run-session.sh a auth-module-01
# or
./experiments/run-session.sh b auth-module-01
```

4. Follow the setup instructions in the generated session directory (copied from `group-a-setup.md` or `group-b-setup.md`).
5. Open a fresh Claude Code conversation in the session directory.
6. Paste the task prompt from `session-task.md` as the first message.
7. Let the agent run to completion without intervening.
8. Score the session using the rubric in `methodology.md`.
9. Record scores in `RESULTS.md`.

## Fairness rules

- Both sessions must use the same Claude model and the same task prompt verbatim.
- No hints, corrections, or follow-up prompts beyond what the task defines.
- Each session must be a fresh directory with no pre-existing code.
- Score independently before comparing Group A and Group B results.
