import argparse
from pathlib import Path
import json
import shutil
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "scripts" / "dependencies.json").read_text(encoding="utf-8"))
HOME = Path.home()
CACHE_ROOT = HOME / ".skill-harness" / "packs"
CLAUDE_ROOT = HOME / ".claude" / "skills"
AGENTS_ROOT = HOME / ".agents" / "skills"


def run(cmd, cwd=None):
    subprocess.run(cmd, check=True, cwd=cwd)


def clone_or_pull(repo_name: str, url: str) -> Path:
    CACHE_ROOT.mkdir(parents=True, exist_ok=True)
    repo_dir = CACHE_ROOT / repo_name
    if (repo_dir / ".git").exists():
        print(f"updating {repo_name}")
        run(["git", "pull", "--ff-only"], cwd=repo_dir)
    else:
        print(f"cloning {repo_name}")
        run(["git", "clone", url, str(repo_dir)])
    return repo_dir


def sync_tree(src_root: Path, dst_root: Path):
    if not src_root.exists():
        return
    dst_root.mkdir(parents=True, exist_ok=True)
    for skill_dir in sorted([p for p in src_root.iterdir() if p.is_dir()]):
        target = dst_root / skill_dir.name
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(skill_dir, target)


def install_repo(repo_dir: Path):
    sync_tree(repo_dir / ".claude" / "skills", CLAUDE_ROOT)
    sync_tree(repo_dir / ".agents" / "skills", AGENTS_ROOT)


def parse_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("agents", nargs="*", help="Backward-compatible agent names.")
    parser.add_argument("--agent", action="append", dest="agent_flags", default=[], help="Agent to include.")
    parser.add_argument("--repo", action="append", dest="repos", default=[], help="Pack repo to include.")
    parser.add_argument("--all", action="store_true", help="Install every configured pack repo.")
    return parser.parse_args(argv[1:])


def required_repos(selected_agents, selected_repos, include_all=False):
    if include_all:
        return sorted(CONFIG["repos"].keys())
    needed = set(selected_repos)
    if not selected_agents and not needed:
        return sorted(CONFIG["repos"].keys())
    for repo in needed:
        if repo not in CONFIG["repos"]:
            raise SystemExit(f"unknown repo: {repo}")
    for agent in selected_agents:
        if agent not in CONFIG["agents"]:
            raise SystemExit(f"unknown agent: {agent}")
        needed.update(CONFIG["agents"][agent]["repos"])
    return sorted(needed)


def main(argv):
    args = parse_args(argv)
    selected_agents = list(dict.fromkeys(args.agents + args.agent_flags))
    selected_repos = list(dict.fromkeys(args.repos))
    repos = required_repos(selected_agents, selected_repos, include_all=args.all)
    for repo_name in repos:
        repo_dir = clone_or_pull(repo_name, CONFIG["repos"][repo_name]["url"])
        install_repo(repo_dir)
    subprocess.run(
        [sys.executable, str(ROOT / "scripts" / "normalize_skills.py"), str(AGENTS_ROOT), str(CLAUDE_ROOT)],
        check=True,
    )
    print(f"installed dependencies for {len(repos)} pack repos")


if __name__ == "__main__":
    main(sys.argv)
