#!/usr/bin/env bash
# Runs every time the container starts. Clones the repo into /workspace on
# first boot only (a named volume there makes that persist across restarts);
# after that it just makes sure dependencies are current, then stays alive
# for VS Code to attach to.
set -euo pipefail

REPO_URL="${REPO_URL:-git@github.com:RyanRau/mono.git}"
REPO_REF="${REPO_REF:-main}"
REPO_DIR="/workspace/mono"

# Runtime, not build time: if ~/.ssh is bind-mounted in (the documented way to
# give this container your GitHub identity), it replaces /root/.ssh wholesale
# and would otherwise shadow anything baked into the image at build time.
mkdir -p /root/.ssh
chmod 700 /root/.ssh
ssh-keyscan -t rsa,ecdsa,ed25519 github.com >>/root/.ssh/known_hosts 2>/dev/null
sort -u -o /root/.ssh/known_hosts /root/.ssh/known_hosts 2>/dev/null || true

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "Cloning $REPO_URL@$REPO_REF into $REPO_DIR..."
  git clone --branch "$REPO_REF" "$REPO_URL" "$REPO_DIR"
else
  echo "$REPO_DIR already has a checkout — leaving it as-is (this volume persists across restarts)."
fi

if [ -f "$REPO_DIR/package.json" ]; then
  ( cd "$REPO_DIR" && npm install && npm run bootstrap ) \
    || echo "warning: 'npm install && npm run bootstrap' failed — re-run it by hand once attached."
fi

echo
echo "Ready. In VS Code: Cmd/Ctrl+Shift+P -> 'Dev Containers: Attach to Running Container...' -> this container, then open /workspace/mono."
echo "From its integrated terminal: infra/devbox/devbox up --local"

exec sleep infinity
