import argparse
from pathlib import Path
import json
import sys

ROOT = Path(__file__).resolve().parents[1]
LOADOUTS = json.loads((ROOT / "scripts" / "agent_loadouts.json").read_text(encoding="utf-8"))
SOURCE = ROOT / ".codex" / "agents"
TARGET = Path.home() / ".codex" / "agents"
SKILL_ROOT = Path.home() / ".agents" / "skills"
TARGET.mkdir(parents=True, exist_ok=True)


def parse_args(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument("agents", nargs="*", help="Backward-compatible agent names.")
    parser.add_argument("--agent", action="append", dest="agent_flags", default=[], help="Agent to render.")
    parser.add_argument("--all", action="store_true", help="Render every configured agent.")
    return parser.parse_args(argv[1:])


def main(argv):
    args = parse_args(argv)
    selected = list(dict.fromkeys(args.agents + args.agent_flags))
    if args.all or not selected:
        selected = sorted(LOADOUTS.keys())
    for name in selected:
        cfg = LOADOUTS.get(name)
        if cfg is None:
            raise SystemExit(f"unknown agent: {name}")
        src = SOURCE / f"{name}.toml"
        text = src.read_text(encoding="utf-8").rstrip() + "\n\n"
        for skill in cfg["skills"]:
            skill_path = (SKILL_ROOT / skill / "SKILL.md").resolve()
            text += "[[skills.config]]\n"
            text += f"path = {json.dumps(str(skill_path))}\n"
            text += "enabled = true\n\n"
        (TARGET / f"{name}.toml").write_text(text, encoding="utf-8", newline="\n")
        print(f"rendered {name}.toml -> {TARGET}")


if __name__ == "__main__":
    main(sys.argv)
