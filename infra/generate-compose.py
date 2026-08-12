#!/usr/bin/env python3
"""
Reads deploy.yml and generates a docker-compose.yml with:
- Traefik reverse proxy with Let's Encrypt
- One internal (non-routed) service per enabled entry in `services:`
- One service per enabled app with proper Traefik labels

Apps marked `development: true` are routed at their test subdomain
(test-<subdomain>, or test.<domain> for the root app) instead of the real one,
so an app can be live and iterated on without claiming its final URL. Flipping
the flag to false promotes it; the next deploy moves the route.
"""

import copy
import os

import yaml

CONFIG_PATH = os.environ.get("CONFIG_PATH", "deploy.yml")

with open(CONFIG_PATH) as f:
    config = yaml.safe_load(f)

domain = config["domain"]
registry = config["registry"]
email = config["letsencrypt_email"]

services = {}
named_volumes = {"letsencrypt": {}}

# Traefik reverse proxy
services["traefik"] = {
    "image": "traefik:v2.11",
    "container_name": "traefik",
    "restart": "unless-stopped",
    "command": [
        "--api.dashboard=false",
        "--providers.docker=true",
        "--providers.docker.exposedbydefault=false",
        "--entrypoints.web.address=:80",
        "--entrypoints.websecure.address=:443",
        "--entrypoints.web.http.redirections.entrypoint.to=websecure",
        "--entrypoints.web.http.redirections.entrypoint.scheme=https",
        "--certificatesresolvers.le.acme.httpchallenge=true",
        "--certificatesresolvers.le.acme.httpchallenge.entrypoint=web",
        f"--certificatesresolvers.le.acme.email={email}",
        "--certificatesresolvers.le.acme.storage=/letsencrypt/acme.json",
    ],
    "ports": ["80:80", "443:443"],
    "volumes": [
        "/var/run/docker.sock:/var/run/docker.sock:ro",
        "letsencrypt:/letsencrypt",
    ],
    "networks": ["web"],
}


def collect_named_volumes(volume_entries):
    """Register named volumes (e.g. "pgdata:/var/lib/...") in the top-level map."""
    for entry in volume_entries:
        source = entry.split(":", 1)[0]
        if not source.startswith(("/", ".")):
            named_volumes[source] = {}


# Internal services (no Traefik routing, no host ports — only reachable
# from other containers on the shared network)
enabled_services = []
for name, svc in config.get("services", {}).items():
    if not svc.get("enabled", False):
        continue

    enabled_services.append(name)
    service = {
        "image": svc["image"],
        "container_name": name,
        "restart": "unless-stopped",
        "networks": ["web"],
    }
    for key in ("environment", "volumes", "healthcheck"):
        if svc.get(key):
            service[key] = svc[key]
    collect_named_volumes(svc.get("volumes", []))
    services[name] = service


# Requests/second per source IP, applied to every router. Generous enough that
# a human never notices, low enough to blunt credential stuffing and scraping.
DEFAULT_RATE_LIMIT = {"average": 100, "burst": 50}

# X-Frame-Options. SAMEORIGIN still allows same-origin iframes (Storybook's
# preview pane), while denying other sites the ability to frame these apps.
DEFAULT_FRAME_OPTIONS = "SAMEORIGIN"


def make_service_labels(name, fqdn, port, frame_options=None, rate_limit=None):
    frame_options = frame_options or DEFAULT_FRAME_OPTIONS
    limits = dict(DEFAULT_RATE_LIMIT, **(rate_limit or {}))

    return [
        "traefik.enable=true",
        f"traefik.http.routers.{name}.rule=Host(`{fqdn}`)",
        f"traefik.http.routers.{name}.entrypoints=websecure",
        f"traefik.http.routers.{name}.tls.certresolver=le",
        f"traefik.http.services.{name}.loadbalancer.server.port={port}",
        f"traefik.http.middlewares.{name}-security.headers.stsSeconds=31536000",
        f"traefik.http.middlewares.{name}-security.headers.stsIncludeSubdomains=true",
        f"traefik.http.middlewares.{name}-security.headers.stsPreload=true",
        f"traefik.http.middlewares.{name}-security.headers.customFrameOptionsValue={frame_options}",
        f"traefik.http.middlewares.{name}-security.headers.contentTypeNosniff=true",
        f"traefik.http.middlewares.{name}-security.headers.browserXssFilter=true",
        f"traefik.http.middlewares.{name}-security.headers.referrerPolicy=strict-origin-when-cross-origin",
        f"traefik.http.middlewares.{name}-ratelimit.rateLimit.average={limits['average']}",
        f"traefik.http.middlewares.{name}-ratelimit.rateLimit.burst={limits['burst']}",
        f"traefik.http.routers.{name}.middlewares={name}-security,{name}-ratelimit",
    ]


def app_fqdn(subdomain, development):
    """Where an app is routed. Development apps take the `test-` namespace."""
    if development:
        return f"test-{subdomain}.{domain}" if subdomain else f"test.{domain}"
    return f"{subdomain}.{domain}" if subdomain else domain


def apply_app_extras(service, app):
    """Optional depends_on (map of service -> condition) and healthcheck."""
    depends_on = app.get("depends_on", {})
    if depends_on:
        service["depends_on"] = {
            dep: {"condition": condition} for dep, condition in depends_on.items()
        }
    if app.get("healthcheck"):
        service["healthcheck"] = copy.deepcopy(app["healthcheck"])


# App services
enabled_apps = []
for name, app in config.get("apps", {}).items():
    if not app.get("enabled", False):
        continue

    subdomain = app["subdomain"]
    port = app.get("port", 80)
    fqdn = app_fqdn(subdomain, app.get("development", False))
    enabled_apps.append(f"{name} → {fqdn}")

    service = {
        "image": f"{registry}/{name}:latest",
        "container_name": name,
        "restart": "unless-stopped",
        "labels": make_service_labels(
            name, fqdn, port, app.get("frame_options"), app.get("rate_limit")
        ),
        "networks": ["web"],
    }

    # Runtime environment variables (not baked into image)
    env_vars = app.get("environment", {})
    if env_vars:
        service["environment"] = env_vars

    if app.get("volumes"):
        service["volumes"] = app["volumes"]
        collect_named_volumes(app["volumes"])

    apply_app_extras(service, app)

    services[name] = service

compose = {
    "services": services,
    "volumes": named_volumes,
    "networks": {
        "web": {"driver": "bridge", "name": "traefik_web"},
    },
}

output_path = os.environ.get("COMPOSE_OUTPUT", "docker-compose.yml")
with open(output_path, "w") as f:
    yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

print("Generated docker-compose.yml with enabled apps:")
for entry in enabled_apps:
    print(f"  {entry}")
if enabled_services:
    print(f"  + internal services: {enabled_services}")
