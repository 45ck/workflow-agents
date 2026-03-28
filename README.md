# skill-harness

<p align="center">
  <img src="logo.svg" alt="skill-harness logo" width="128" height="128" />
</p>

`skill-harness` is the setup repo for the 45ck agent workflow stack.

It does four jobs:

- installs the shared skill-pack suite
- installs the shared Claude and Codex agents
- bootstraps project-level tooling with `@45ck/noslop` and `45ck/agent-docs`
- optionally bootstraps Beads, enabled by default in project setup

## What it can set up

### Shared suite

- 26 dependent pack repos
- shared skills synced into `~/.claude/skills/` and `~/.agents/skills/`
- shared Claude agents
- shared Codex agents

### Project tooling

- `@45ck/noslop`
- `45ck/agent-docs`
- `bd` / Beads

Use the project setup command when you want a repo scaffolded with the 45ck tooling stack:

```bash
./skill-harness setup-project --dir path/to/project
```

That command:

- creates a `package.json` if the target repo does not have one yet
- installs `@45ck/noslop` and `45ck/agent-docs`
- installs the Beads CLI if it is not already present
- runs `agent-docs init`
- runs `noslop init`
- runs `bd init`
- runs `agent-docs install-gates --quality`

## Install the CLI

### Build locally

```bash
git clone https://github.com/45ck/skill-harness.git
cd skill-harness
go build -o skill-harness ./cmd/skill-harness
```

Windows:

```powershell
git clone https://github.com/45ck/skill-harness.git
cd skill-harness
go build -o skill-harness.exe .\cmd\skill-harness
```

### Use wrapper scripts

```bash
bash install.sh
```

```powershell
.\install.ps1
```

### Download a release bundle

Release bundles can ship the binary plus the repo files together so Go is not required.

Build them with:

```bash
python scripts/build_release.py --version v0.1.0
```

## Main commands

### Install the full shared suite

```bash
./skill-harness install --all
```

### Install selected agents

```bash
./skill-harness install --agents=requirements-analyst,system-modeler,security-reviewer
```

### Install selected packs only

```bash
./skill-harness install --packs=business-analysis-skills,documentation-evidence-skills --packs-only
```

### Use the interactive installer

```bash
./skill-harness install --interactive
```

### Set up a project with noslop and agent-docs

```bash
./skill-harness setup-project --dir ../my-project
```

Install only the packages and skip initialization:

```bash
./skill-harness setup-project --dir ../my-project --install-only
```

Skip one tool:

```bash
./skill-harness setup-project --dir ../my-project --skip-agent-docs
./skill-harness setup-project --dir ../my-project --skip-noslop
./skill-harness setup-project --dir ../my-project --skip-beads
```

### Validate installed agent dependencies

```bash
./skill-harness check --all
```

## Included agents

- `requirements-analyst`
- `requirements-analyst-beads`
- `ux-researcher`
- `system-modeler`
- `system-modeler-beads`
- `software-architect`
- `software-architect-beads`
- `web-engineer`
- `backend-engineer`
- `test-designer`
- `test-designer-beads`
- `qa-automation-engineer`
- `quality-reviewer`
- `security-reviewer`
- `security-reviewer-beads`
- `pentest-reviewer`
- `delivery-manager`
- `delivery-manager-beads`
- `research-writer`

Agent-to-skill mapping lives in [docs/agent-loadouts.md](docs/agent-loadouts.md).

## Included pack repos

- `agile-delivery-skills`
- `authentication-cryptography-skills`
- `automation-testing-skills`
- `backend-persistence-skills`
- `business-analysis-skills`
- `code-review-inspection-skills`
- `data-structures-algorithmic-reasoning-skills`
- `deployment-release-skills`
- `design-for-testability-skills`
- `documentation-evidence-skills`
- `enterprise-architecture-integration-skills`
- `hci-review-skill`
- `llm-agent-security-skills`
- `maintenance-evolution-skills`
- `non-functional-testing-skills`
- `oop-code-structure-skills`
- `pentest-security-testing-skills`
- `project-management-skills`
- `refactoring-code-smells-skills`
- `research-literature-review-skills`
- `security-engineering-skills`
- `software-architecture-skills`
- `software-quality-skills`
- `uml-analysis-modelling-skills`
- `verification-test-design-skills`
- `web-engineering-skills`

## For other agents

If another agent needs to install this repo or use it as the setup entrypoint, point it at [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md).

## Important files

- [cmd/skill-harness/main.go](cmd/skill-harness/main.go)
- [AGENT_INSTRUCTIONS.md](AGENT_INSTRUCTIONS.md)
- [scripts/dependencies.json](scripts/dependencies.json)
- [scripts/build_release.py](scripts/build_release.py)

## License

[MIT](LICENSE)
