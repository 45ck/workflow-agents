# Benchmark Methodology

## Experiment goal

Does the full toolkit (specgraph + noslop + skill-harness skills) produce measurably better software development outcomes than raw Claude Code with no tooling?

The toolkit introduces three enforcement layers:

1. **specgraph** — specification management, evidence tracking, and verification. Forces the agent to write specs before code and annotate implementations with traceable evidence.
2. **noslop** — pre-commit hooks, CI required checks, and Claude Code guardrails. Prevents low-quality commits from landing silently.
3. **skill-harness skills** — procedural skills (spec-writer, annotation-writer, evidence-gap-review, noslop-commit-gate, etc.) that guide the agent through correct workflows step by step.

The null hypothesis is that there is no measurable difference. The experiment aims to falsify it.

## Groups

| | Group A | Group B |
|---|---|---|
| Label | Full toolkit | Baseline |
| specgraph installed | Yes | No |
| noslop installed | Yes | No |
| Skill-harness skills loaded | Yes | No |
| AGENTS.md present | Yes | No |
| Task prompt | Identical | Identical |
| Claude model | Same | Same |

## Session task

Both groups receive the same task prompt from `session-task.md` as the first and only message in a fresh Claude Code conversation. No follow-up prompts are allowed. No clarifications. The agent runs to completion on its own.

## Session format

1. Create a fresh empty project directory (use `run-session.sh`).
2. Apply group-specific setup (tools, skills, AGENTS.md) — or no setup for Group B.
3. Open a new Claude Code conversation in that directory.
4. Paste the task prompt verbatim.
5. Do not interact until the agent declares completion or becomes idle.
6. Record the final state of the directory for scoring.

## Metrics

Score each metric on a 0–5 integer scale. Higher is always better (metrics 4 and 5 are inverted as noted).

### 1. Spec compliance (0–5)

Did the agent write and follow formal specifications?

| Score | Meaning |
|---|---|
| 0 | No specs written; code exists with no documented requirements |
| 1 | Informal comments only; no structured spec documents |
| 2 | Some specs written but incomplete or not linked to code |
| 3 | Specs written with correct frontmatter; partially linked to implementation |
| 4 | Specs written; most implementation files annotated with `@spec`/`@implements` |
| 5 | Full spec coverage; all requirements traceable to implementation |

### 2. Evidence quality (0–5)

Is the implementation traceable to specs through verifiable evidence?

| Score | Meaning |
|---|---|
| 0 | No evidence; no annotations, no tests tied to specs |
| 1 | Annotations present but incorrect or mismatched |
| 2 | Annotations present; `specgraph verify` reports many gaps |
| 3 | Annotations present; `specgraph verify` passes with minor warnings |
| 4 | Annotations and test evidence; `specgraph verify` passes cleanly |
| 5 | Full evidence chain: annotations + tests + passing verification; waivers justified |

### 3. Output correctness (0–5)

Does the produced code actually work?

| Score | Meaning |
|---|---|
| 0 | Code does not run; syntax or import errors |
| 1 | Code runs but core acceptance criteria unmet |
| 2 | Core feature partially works; edge cases broken |
| 3 | Core feature works; some acceptance criteria unmet |
| 4 | All acceptance criteria met; minor issues only |
| 5 | All acceptance criteria met; robust error handling; tests pass |

### 4. Over-engineering (0–5) — inverted

Did the agent add unnecessary complexity, abstraction, or scope beyond the task?

| Score | Meaning |
|---|---|
| 0 | Severe bloat: multiple unrequested abstractions, frameworks, or subsystems |
| 1 | Significant scope creep; noticeably more code than the task requires |
| 2 | Mild over-engineering; a few unnecessary patterns or files |
| 3 | Mostly appropriate; one minor unnecessary addition |
| 4 | Clean implementation; nothing unnecessary |
| 5 | Minimal, precise implementation; exactly what the task asked for |

### 5. Drift (0–5) — inverted

Did the agent stay on task, or did it wander into unrelated work?

| Score | Meaning |
|---|---|
| 0 | Agent abandoned the task or worked on entirely different things |
| 1 | Significant tangents; task partially completed alongside unrelated work |
| 2 | Mild drift; some off-task exploration |
| 3 | Mostly on task; one minor detour |
| 4 | Fully on task with negligible deviation |
| 5 | Laser-focused; every action directly served the task |

### 6. Quality gate adherence (0–5)

Did the agent use quality checks before committing or declaring completion?

| Score | Meaning |
|---|---|
| 0 | No quality checks performed |
| 1 | Ran linter or tests once but ignored failures |
| 2 | Ran checks; fixed some failures; left others |
| 3 | Ran checks; fixed all failures; did not verify final state |
| 4 | Ran checks; fixed all failures; verified clean final state |
| 5 | Used noslop gates or equivalent; all gates passed before completion |

### 7. Documentation quality (0–5)

Are the specs, comments, and docs useful, accurate, and complete?

| Score | Meaning |
|---|---|
| 0 | No documentation of any kind |
| 1 | Minimal inline comments; no spec docs |
| 2 | Some comments and a README; spec docs absent or inaccurate |
| 3 | README and inline docs present; spec docs present but thin |
| 4 | Good README, accurate inline docs, useful spec documents |
| 5 | Comprehensive docs: README, specs, inline comments all accurate and actionable |

## Scoring

A human reviewer scores each metric independently before seeing the other group's score.

**Total score: sum of all 7 metrics. Maximum = 35.**

Record scores in `RESULTS.md`.

## Interpretation

| Total | Interpretation |
|---|---|
| 28–35 | Excellent — the agent met or exceeded all expectations |
| 21–27 | Good — solid output with minor gaps |
| 14–20 | Fair — task partially completed; notable gaps |
| 7–13 | Poor — significant failures in core areas |
| 0–6 | Failed — task not meaningfully completed |

A difference of 7 or more total points between Group A and Group B is considered a meaningful signal. Repeat across multiple sessions to establish a pattern.
