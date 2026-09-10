#!/usr/bin/env python3
"""
Print every distinct runtime env var name referenced via `${NAME}` in any
enabled app's (or internal service's) `environment:` map in deploy.yml, one
per line -- the deploy workflow resolves each by the same-named GitHub
secret and writes them all into a fresh /opt/apps/.env on the droplet, the
same "secret name == var name, no workflow edit needed" convention
infra/app_field.py's `build_args` already uses.

    python3 infra/collect_env_vars.py

Unlike `build_args` (resolved per-app, only for apps selected for build this
run), this scans every enabled app regardless of its `development` flag --
/opt/apps/.env is one droplet-wide file shared by both the production and
test Compose projects, not a per-app or per-build artifact.
"""

import os
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", REPO_ROOT / "deploy.yml"))

# Bare ${NAME} only -- infra/validate_deploy.py rejects any other shape
# (e.g. Compose's ${VAR:-default}) so this doesn't need to handle it.
VAR_REF_RE = re.compile(r"^\$\{([A-Z_][A-Z0-9_]*)\}$")


def names_from(environment):
    names = set()
    for value in (environment or {}).values():
        if isinstance(value, str):
            match = VAR_REF_RE.match(value)
            if match:
                names.add(match.group(1))
    return names


def main():
    config = yaml.safe_load(CONFIG_PATH.read_text()) or {}
    names = set()

    for app in (config.get("apps") or {}).values():
        if isinstance(app, dict) and app.get("enabled") is True:
            names.update(names_from(app.get("environment")))

    for svc in (config.get("services") or {}).values():
        if isinstance(svc, dict) and svc.get("enabled") is True:
            names.update(names_from(svc.get("environment")))

    for name in sorted(names):
        print(name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
