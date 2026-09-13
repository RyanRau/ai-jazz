# A standalone, publishable image (ghcr.io/ryanrau/mono/devcontainer) — unlike
# devcontainer.json (which VS Code builds from a *local* checkout), this image
# needs nothing but Docker to run: `docker run` it directly and it clones the
# repo into its own filesystem on first boot. See infra/devbox/README.md for
# the exact commands and what to mount.
FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

# Docker CLI talking to the HOST's daemon (mounted in at `docker run` time via
# -v /var/run/docker.sock:/var/run/docker.sock) — not a nested daemon, so
# anything `infra/devbox/devbox up` starts here runs on the real host and is
# reachable from a normal browser, not trapped inside this container's netns.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git python3 python3-pip python3-venv \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --break-system-packages --no-cache-dir pyyaml ruff \
    && npm install -g @anthropic-ai/claude-code

# Muse Code (Meta's CLI coding agent, https://developer.meta.com/ai/lp/muse-code/)
# isn't baked in here on purpose — its installer is `curl | bash` from a
# third-party host, which shouldn't run unattended at image-build time. Run it
# once yourself after attaching:
#   curl -fsSL https://dev.meta.ai/install.sh | bash

WORKDIR /workspace
COPY entrypoint.sh /usr/local/bin/devbox-entrypoint
RUN chmod +x /usr/local/bin/devbox-entrypoint
ENTRYPOINT ["/usr/local/bin/devbox-entrypoint"]
