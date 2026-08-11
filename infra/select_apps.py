#!/usr/bin/env python3
"""
Decide which enabled apps a change set affects.

Used by both the deploy and PR-validation workflows so the rule lives in one
place and can be tested without running CI:

    python3 infra/select_apps.py --base <ref> --head <ref>
    python3 infra/select_apps.py --all
    git diff --name-only A B | python3 infra/select_apps.py --stdin

Prints the selected app names, space-separated, on one line.

Anything shared — the component library, the deploy tooling, the config, the
workflows — invalidates every image, so a change there selects everything. When
the base commit is missing or unreadable, it selects everything rather than
risk skipping a build.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", REPO_ROOT / "deploy.yml"))

SHARED_PATHS = re.compile(
    r"^(packages/|infra/|deploy\.yml$|package(-lock)?\.json$|\.github/workflows/)"
)


def enabled_apps(config):
    """App name → build context path, for every enabled app."""
    return {
        name: app.get("path", f"apps/{name}")
        for name, app in (config.get("apps") or {}).items()
        if isinstance(app, dict) and app.get("enabled") is True
    }


def changed_files(base, head):
    """Diff base..head, or None if the base isn't resolvable in this checkout."""
    try:
        subprocess.run(
            ["git", "cat-file", "-e", f"{base}^{{commit}}"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
        )
    except subprocess.CalledProcessError:
        return None

    result = subprocess.run(
        ["git", "diff", "--name-only", base, head],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        return None
    return [line for line in result.stdout.splitlines() if line.strip()]


def select(apps, changed):
    """Every app when a shared path changed, else those with changes in their path."""
    if changed is None:
        return list(apps), "no usable base commit"
    if any(SHARED_PATHS.match(path) for path in changed):
        return list(apps), "shared path changed"
    selected = [
        name
        for name, app_path in apps.items()
        if any(path.startswith(f"{app_path}/") for path in changed)
    ]
    return selected, "changed app paths"


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--base", help="base ref to diff from")
    parser.add_argument(
        "--head", default="HEAD", help="head ref to diff to (default: HEAD)"
    )
    parser.add_argument("--all", action="store_true", help="select every enabled app")
    parser.add_argument(
        "--stdin", action="store_true", help="read changed paths from stdin"
    )
    args = parser.parse_args()

    apps = enabled_apps(yaml.safe_load(CONFIG_PATH.read_text()))

    if args.all:
        selected, reason = list(apps), "explicitly requested"
    elif args.stdin:
        paths = [line.strip() for line in sys.stdin if line.strip()]
        selected, reason = select(apps, paths)
    elif args.base:
        selected, reason = select(apps, changed_files(args.base, args.head))
    else:
        selected, reason = list(apps), "no base ref given"

    # Ordered as deploy.yml lists them, so logs read consistently.
    ordered = [name for name in apps if name in selected]
    print(" ".join(ordered))
    print(
        f"selected {len(ordered)} of {len(apps)} enabled app(s) — {reason}",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
