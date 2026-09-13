#!/usr/bin/env bash
# Runs once, the first time this devcontainer is created.
set -euo pipefail

pip install --user pyyaml ruff
npm install -g @anthropic-ai/claude-code

# TODO: add muse's CLI here once we know the package/binary name.

npm install
npm run bootstrap

echo
echo "Ready. Try: infra/devbox/devbox up --local"
