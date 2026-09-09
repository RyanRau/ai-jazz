#!/usr/bin/env python3
"""
Print one field from an app's deploy.yml entry, for the deploy workflow's
build step.

    python3 infra/app_field.py path <app>         # resolved build path
    python3 infra/app_field.py build_args <app>   # one build arg name per line

Replaces a prior "yq" step that downloaded the yq binary from a moving
`latest` release URL and ran it with sudo — a pattern GitHub's automated
workflow-abuse scanner flags as potentially malicious, which blocked every
production deploy behind a manual approval. PyYAML is already a dependency
of infra/validate_deploy.py, so this needs nothing the job doesn't already
install.
"""

import argparse
import os
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", REPO_ROOT / "deploy.yml"))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("field", choices=["path", "build_args"])
    parser.add_argument("app")
    args = parser.parse_args()

    config = yaml.safe_load(CONFIG_PATH.read_text())
    app = ((config or {}).get("apps") or {}).get(args.app)
    if not isinstance(app, dict):
        print(f"error: no app '{args.app}' in deploy.yml", file=sys.stderr)
        return 1

    if args.field == "path":
        print(app.get("path", f"apps/{args.app}"))
    else:
        for arg in app.get("build_args") or []:
            print(arg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
