# Agent Instructions

Use this file when another agent needs to install or use `skill-harness` correctly.

## What this repo is for

`skill-harness` is both:

- the installer for the shared 45ck skill-pack and agent suite
- the setup repo for project-level tooling based on `@45ck/noslop`, `45ck/agent-docs`, and optional Beads integration

## Shared suite install

Run this from the repo root when the goal is to install the shared packs and agents:

```bash
go build -o skill-harness ./cmd/skill-harness
./skill-harness install --all
```

Windows:

```powershell
go build -o skill-harness.exe .\cmd\skill-harness
.\skill-harness.exe install --all
```

Selective install examples:

```bash
./skill-harness install --agents=requirements-analyst,system-modeler
./skill-harness install --packs=business-analysis-skills,documentation-evidence-skills --packs-only
./skill-harness install --interactive
```

## Project setup

Run this when the goal is to bootstrap a target repo with the 45ck project tooling stack:

```bash
./skill-harness setup-project --dir path/to/project
```

Default behavior:

- create `package.json` if missing
- install `@45ck/noslop`
- install `45ck/agent-docs`
- install the Beads CLI by default if it is not already available
- run `agent-docs init`
- run `noslop init`
- run `bd init`
- run `agent-docs install-gates --quality`

Useful variants:

```bash
./skill-harness setup-project --dir path/to/project --install-only
./skill-harness setup-project --dir path/to/project --skip-agent-docs
./skill-harness setup-project --dir path/to/project --skip-noslop
./skill-harness setup-project --dir path/to/project --skip-beads
```

## Rules

- Run commands from the repo root unless the command explicitly targets another directory.
- Prefer the CLI over manual copying.
- Do not assume pack repos are already installed.
- Do not assume `noslop` or `agent-docs` are already present in the target project.
- Use `setup-project` for project scaffolding instead of inventing a custom sequence.

## Verify

After shared-suite installation:

```bash
./skill-harness check --all
```

After project setup:

- confirm `package.json` exists in the target repo
- confirm `@45ck/noslop` and `agent-docs` were installed
- confirm the initialization commands completed without error

## Reference files

- [README.md](README.md)
- [cmd/skill-harness/main.go](cmd/skill-harness/main.go)
- [scripts/dependencies.json](scripts/dependencies.json)
- [scripts/build_release.py](scripts/build_release.py)
