#!/usr/bin/env python3
"""
Refuse a production deploy that would silently drop a live app.

`development: true` moves an app from the production Compose project into the
test one (see generate-compose.py) — the app disappears from
docker-compose.yml the moment this reaches main, and the next production
deploy's `--remove-orphans` tears down its container. That is the right tool
for taking a never-shipped app dev-only, but flipping it on an app that is
*currently* serving production is almost always a mistake: the intent is
"let me test a rework of this," not "take the live site down," and the flag
alone can't tell those apart.

This compares deploy.yml at two refs and fails if any app that was live in
production at the base ref (enabled, not development) is development-only at
the head ref. The fix is never to un-flip it back and forth — add a *second*
deploy.yml entry (a new key, sharing the app's `path` and `subdomain`) with
`development: true` instead. The original key keeps serving production
untouched at its subdomain while the new key builds and tests at
test-<subdomain>; promoting later means deleting the old key and dropping the
flag from the new one, per the "Apps Still In Development" section of
CLAUDE.md.

    python3 infra/check_demotions.py --base <ref> --head <ref>

Exits 0 (skips the check) if the base ref isn't resolvable in this checkout —
a shallow clone shouldn't block a deploy the way a real demotion should.
"""

import argparse
import subprocess
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_apps_at(ref):
    """apps: mapping from deploy.yml at `ref`, or None if unresolvable."""
    try:
        result = subprocess.run(
            ["git", "show", f"{ref}:deploy.yml"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError:
        return None
    config = yaml.safe_load(result.stdout)
    return (config or {}).get("apps") or {}


def was_live(app):
    return (
        isinstance(app, dict)
        and app.get("enabled") is True
        and not app.get("development", False)
    )


def is_dev_only(app):
    return (
        isinstance(app, dict)
        and app.get("enabled") is True
        and app.get("development", False)
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True, help="base ref (the prior state)")
    parser.add_argument("--head", default="HEAD", help="head ref (default: HEAD)")
    args = parser.parse_args()

    base_apps = load_apps_at(args.base)
    if base_apps is None:
        print(
            f"warning: base ref '{args.base}' not resolvable — skipping demotion check",
            file=sys.stderr,
        )
        return 0

    head_apps = load_apps_at(args.head)
    if head_apps is None:
        print(f"error: head ref '{args.head}' not resolvable", file=sys.stderr)
        return 1

    demoted = [
        name
        for name, app in head_apps.items()
        if name in base_apps and was_live(base_apps[name]) and is_dev_only(app)
    ]

    if not demoted:
        return 0

    for name in demoted:
        print(
            f"error: apps.{name} was live in production at '{args.base}' and is now "
            f"'development: true' — merging this removes it from production and "
            f"tears down its container on the next deploy.\n"
            f"  If you're reworking {name}, don't flip the flag on its existing "
            f"entry. Add a second entry (a new key, same 'path' and 'subdomain') "
            f"with 'development: true' instead — the original keeps serving "
            f"production while the new one builds at test-<subdomain>. See "
            f"'Apps Still In Development' in CLAUDE.md.",
            file=sys.stderr,
        )
    print(
        f"\n{len(demoted)} app(s) would be silently demoted from production",
        file=sys.stderr,
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
