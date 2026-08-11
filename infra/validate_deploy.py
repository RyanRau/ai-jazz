#!/usr/bin/env python3
"""
Validate deploy.yml before it reaches the droplet.

Catches the mistakes that otherwise surface as a broken deploy: a subdomain
claimed twice, an app with no Dockerfile, a collision with an externally-hosted
subdomain, a typo'd field name. Run locally or in PR validation:

    python3 infra/validate_deploy.py

Exits non-zero on any error; warnings alone do not fail the run.
"""

import os
import re
import sys
from pathlib import Path

import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = Path(os.environ.get("CONFIG_PATH", REPO_ROOT / "deploy.yml"))

APP_NAME_RE = re.compile(r"^[a-z][a-z0-9_]*$")
SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]*[a-z0-9])?$")
BUILD_ARG_RE = re.compile(r"^[A-Z][A-Z0-9_]*$")

TOP_LEVEL_KEYS = {
    "domain",
    "registry",
    "letsencrypt_email",
    "reserved_subdomains",
    "services",
    "apps",
}
APP_KEYS = {
    "subdomain",
    "enabled",
    "port",
    "path",
    "build_args",
    "environment",
    "volumes",
    "depends_on",
    "healthcheck",
    "frame_options",
    "rate_limit",
}
SERVICE_KEYS = {"image", "enabled", "environment", "volumes", "healthcheck"}

errors = []
warnings = []


def error(message):
    errors.append(message)


def warn(message):
    warnings.append(message)


def check_top_level(config):
    for key in ("domain", "registry", "letsencrypt_email"):
        if not config.get(key):
            error(f"missing required top-level key: {key}")
    for key in config:
        if key not in TOP_LEVEL_KEYS:
            warn(f"unknown top-level key '{key}' — ignored by generate-compose.py")


def check_services(config):
    for name, svc in (config.get("services") or {}).items():
        where = f"services.{name}"
        if not isinstance(svc, dict):
            error(f"{where}: must be a mapping")
            continue
        if not svc.get("image"):
            error(f"{where}: missing required 'image'")
        if "enabled" not in svc:
            error(f"{where}: missing required 'enabled'")
        for key in svc:
            if key not in SERVICE_KEYS:
                warn(f"{where}: unknown key '{key}' — ignored by generate-compose.py")


def check_volumes(where, volumes):
    if not isinstance(volumes, list):
        error(f"{where}.volumes: must be a list of 'source:/container/path' strings")
        return
    for entry in volumes:
        if not isinstance(entry, str) or ":" not in entry:
            error(f"{where}.volumes: '{entry}' must be 'source:/container/path'")
            continue
        _, _, container_path = entry.partition(":")
        if not container_path.startswith("/"):
            error(f"{where}.volumes: '{entry}' container path must be absolute")


def check_app(name, app, config, claimed):
    where = f"apps.{name}"

    if not APP_NAME_RE.match(name):
        error(f"{where}: app names must be snake_case (e.g. recipe_box)")

    if not isinstance(app, dict):
        error(f"{where}: must be a mapping")
        return

    for key in app:
        if key not in APP_KEYS:
            warn(f"{where}: unknown key '{key}' — ignored by generate-compose.py")

    for key in ("subdomain", "enabled", "port"):
        if key not in app:
            error(f"{where}: missing required '{key}'")

    subdomain = app.get("subdomain")
    if subdomain is None:
        subdomain = ""
    elif not isinstance(subdomain, str):
        error(f'{where}.subdomain: must be a string (use "" for the root domain)')
        subdomain = ""
    elif subdomain and not SUBDOMAIN_RE.match(subdomain):
        error(f"{where}.subdomain: '{subdomain}' must be kebab-case (e.g. recipe-box)")

    if not isinstance(app.get("enabled"), bool):
        error(f"{where}.enabled: must be true or false")

    port = app.get("port")
    if not isinstance(port, int) or isinstance(port, bool) or not (1 <= port <= 65535):
        error(f"{where}.port: must be an integer between 1 and 65535")

    # Subdomains and build inputs only matter while the app is live — a disabled
    # app may legitimately have no Dockerfile yet. Everything below this block
    # is checked regardless, so problems surface before you flip enabled on.
    if app.get("enabled") is True:
        if subdomain == "test" or subdomain.startswith("test-"):
            error(
                f"{where}.subdomain: 'test' / 'test-*' is reserved for test deployments"
            )

        if subdomain in claimed:
            error(
                f"{where}.subdomain: '{subdomain or '(root)'}' already claimed by '{claimed[subdomain]}'"
            )
        else:
            claimed[subdomain] = name

        for reserved in config.get("reserved_subdomains") or []:
            if subdomain == reserved:
                error(
                    f"{where}.subdomain: '{subdomain}' is reserved for an externally-deployed app"
                )

        app_path = app.get("path", f"apps/{name}")
        if not (REPO_ROOT / app_path / "Dockerfile").is_file():
            error(
                f"{where}: no Dockerfile at {app_path}/Dockerfile (set 'path' if it lives elsewhere)"
            )
        if not (REPO_ROOT / app_path / "README.md").is_file():
            warn(f"{where}: no README.md at {app_path}/ — every app documents itself")

    build_args = app.get("build_args") or []
    if not isinstance(build_args, list):
        error(f"{where}.build_args: must be a list of names")
    else:
        for arg in build_args:
            if not isinstance(arg, str) or not BUILD_ARG_RE.match(arg):
                error(f"{where}.build_args: '{arg}' must be UPPER_SNAKE_CASE")

    environment = app.get("environment")
    if environment is not None and not isinstance(environment, dict):
        error(f"{where}.environment: must be a mapping of NAME: value")

    if app.get("volumes") is not None:
        check_volumes(where, app["volumes"])

    for dep, condition in (app.get("depends_on") or {}).items():
        if dep not in (config.get("services") or {}):
            error(f"{where}.depends_on: '{dep}' is not a declared internal service")
        elif (config["services"][dep] or {}).get("enabled") is not True:
            error(f"{where}.depends_on: internal service '{dep}' is not enabled")
        if not isinstance(condition, str) or not condition.startswith("service_"):
            error(
                f"{where}.depends_on.{dep}: condition should be e.g. 'service_healthy'"
            )

    healthcheck = app.get("healthcheck")
    if healthcheck is not None:
        if not isinstance(healthcheck, dict) or "test" not in healthcheck:
            error(f"{where}.healthcheck: must be a mapping containing 'test'")

    rate_limit = app.get("rate_limit")
    if rate_limit is not None:
        if not isinstance(rate_limit, dict):
            error(
                f"{where}.rate_limit: must be a mapping with 'average' and/or 'burst'"
            )
        else:
            for key, value in rate_limit.items():
                if key not in ("average", "burst"):
                    error(f"{where}.rate_limit: unknown key '{key}'")
                elif not isinstance(value, int) or isinstance(value, bool) or value < 1:
                    error(f"{where}.rate_limit.{key}: must be a positive integer")


def main():
    if not CONFIG_PATH.is_file():
        print(f"error: {CONFIG_PATH} not found", file=sys.stderr)
        return 1

    try:
        config = yaml.safe_load(CONFIG_PATH.read_text())
    except yaml.YAMLError as exc:
        print(f"error: {CONFIG_PATH} is not valid YAML:\n{exc}", file=sys.stderr)
        return 1

    if not isinstance(config, dict):
        print(f"error: {CONFIG_PATH} must be a mapping", file=sys.stderr)
        return 1

    check_top_level(config)
    check_services(config)

    apps = config.get("apps") or {}
    if not apps:
        warn("no apps declared")

    claimed = {}
    for name, app in apps.items():
        check_app(name, app, config, claimed)

    for message in warnings:
        print(f"warning: {message}")
    for message in errors:
        print(f"error: {message}", file=sys.stderr)

    enabled = [
        name
        for name, app in apps.items()
        if isinstance(app, dict) and app.get("enabled")
    ]
    if errors:
        print(f"\n{len(errors)} error(s) in {CONFIG_PATH.name}", file=sys.stderr)
        return 1

    print(
        f"\ndeploy.yml OK — {len(enabled)} enabled app(s): {', '.join(sorted(enabled))}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
