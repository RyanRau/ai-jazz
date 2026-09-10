#!/usr/bin/env python3
"""
Renders deploy.yml into a docker-compose file. Two modes, two Compose projects,
so a test deploy can never disturb production.

    python3 infra/generate-compose.py              # production
    python3 infra/generate-compose.py --test       # test

**production** (project `apps`, `docker-compose.yml`) — Traefik, the internal
services, and every enabled app *without* `development: true`, at its real
subdomain, from the `:latest` image.

**test** (project `mono-test`, `docker-compose.test.yml`) — only the enabled apps
*with* `development: true`, at `test-<subdomain>` (or `test.<domain>` for the root
app), from the `:test` image, built off whichever branch you ran the workflow on.
Services and containers get a `-test` suffix, and the Traefik network is joined as
external rather than created.

The split matters because `docker compose --remove-orphans` is project-scoped: a
production deploy only ever sees production containers, so it cannot remove a
running test app, and vice versa. It is the same isolation that lets apps from
other repos share the droplet.
"""

import argparse
import copy
import os

import yaml

# Requests/second per source IP, applied to every router. Generous enough that
# a human never notices, low enough to blunt credential stuffing and scraping.
DEFAULT_RATE_LIMIT = {"average": 100, "burst": 50}

# X-Frame-Options. SAMEORIGIN still allows same-origin iframes (Storybook's
# preview pane), while denying other sites the ability to frame these apps.
DEFAULT_FRAME_OPTIONS = "SAMEORIGIN"

# Fixed so external Compose projects — and the test project below — can join it.
NETWORK_NAME = "traefik_web"
TEST_PROJECT = "mono-test"


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


def traefik_service(email):
    return {
        "image": "traefik:v2.11",
        "container_name": "traefik",
        "restart": "unless-stopped",
        "command": [
            "--api.dashboard=false",
            "--providers.docker=true",
            "--providers.docker.exposedbydefault=false",
            # Static routes to backends Traefik can't discover via Docker labels
            # (nothing's running in a container it can see) -- currently just
            # home-server/llm-gateway, reachable over the WireGuard tunnel to
            # the home network. See infra/traefik/dynamic/.
            "--providers.file.directory=/etc/traefik/dynamic",
            "--providers.file.watch=true",
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
            "./infra/traefik/dynamic:/etc/traefik/dynamic:ro",
        ],
        "networks": ["web"],
    }


def build(config, test_mode):
    domain = config["domain"]
    registry = config["registry"]

    services = {}
    named_volumes = {} if test_mode else {"letsencrypt": {}}
    routed = []
    internal = []

    def collect_named_volumes(volume_entries):
        """Register named volumes (e.g. "pgdata:/var/lib/...") in the top-level map."""
        for entry in volume_entries:
            source = entry.split(":", 1)[0]
            if not source.startswith(("/", ".")):
                named_volumes[source] = {}

    if not test_mode:
        services["traefik"] = traefik_service(config["letsencrypt_email"])

        # Internal services (no Traefik routing, no host ports — only reachable
        # from other containers on the shared network). Production-only: the
        # test project reaches them over the shared network by service name.
        for name, svc in (config.get("services") or {}).items():
            if not svc.get("enabled", False):
                continue
            internal.append(name)
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

    for name, app in (config.get("apps") or {}).items():
        if not app.get("enabled", False):
            continue
        # The two modes partition the apps: every app belongs to exactly one
        # project, which is what keeps --remove-orphans from crossing over.
        if bool(app.get("development", False)) != test_mode:
            continue

        subdomain = app["subdomain"]
        port = app.get("port", 80)

        if test_mode:
            service_name = f"{name}-test"
            fqdn = f"test-{subdomain}.{domain}" if subdomain else f"test.{domain}"
            image = f"{registry}/{name}:test"
        else:
            service_name = name
            fqdn = f"{subdomain}.{domain}" if subdomain else domain
            image = f"{registry}/{name}:latest"

        routed.append(f"{service_name} → {fqdn}")

        service = {
            "image": image,
            "container_name": service_name,
            "restart": "unless-stopped",
            "labels": make_service_labels(
                service_name,
                fqdn,
                port,
                app.get("frame_options"),
                app.get("rate_limit"),
            ),
            "networks": ["web"],
        }

        # Runtime environment variables (not baked into image)
        if app.get("environment"):
            service["environment"] = app["environment"]

        if app.get("volumes"):
            # Named volumes are prefixed by the Compose project, so the test
            # project gets its own empty volumes rather than production's data.
            service["volumes"] = app["volumes"]
            collect_named_volumes(app["volumes"])

        depends_on = app.get("depends_on") or {}
        if depends_on and not test_mode:
            service["depends_on"] = {
                dep: {"condition": condition} for dep, condition in depends_on.items()
            }
        if app.get("healthcheck"):
            service["healthcheck"] = copy.deepcopy(app["healthcheck"])

        services[service_name] = service

    if test_mode:
        # Traefik and the network are owned by the production project; join them.
        network = {"external": True, "name": NETWORK_NAME}
    else:
        network = {"driver": "bridge", "name": NETWORK_NAME}

    compose = {"services": services}
    if named_volumes:
        compose["volumes"] = named_volumes
    compose["networks"] = {"web": network}

    return compose, routed, internal


def main():
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="render the development apps into the test project instead",
    )
    parser.add_argument("--output", help="output path (default depends on mode)")
    args = parser.parse_args()

    config_path = os.environ.get("CONFIG_PATH", "deploy.yml")
    with open(config_path) as f:
        config = yaml.safe_load(f)

    compose, routed, internal = build(config, args.test)

    default_output = "docker-compose.test.yml" if args.test else "docker-compose.yml"
    output_path = args.output or os.environ.get("COMPOSE_OUTPUT", default_output)
    with open(output_path, "w") as f:
        yaml.dump(compose, f, default_flow_style=False, sort_keys=False)

    label = f"test (project {TEST_PROJECT})" if args.test else "production"
    print(f"Generated {output_path} — {label}")
    if not routed:
        print("  (no apps)")
    for entry in routed:
        print(f"  {entry}")
    if internal:
        print(f"  + internal services: {internal}")


if __name__ == "__main__":
    main()
