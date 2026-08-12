#!/usr/bin/env bash
# Remove everything in the `mono-test` Compose project from this droplet.
#
# Run from /opt/apps, either by the deploy workflow or by hand:
#
#     ssh deploy@<droplet>
#     cd /opt/apps && bash infra/retire_test_apps.sh
#
# A production deploy runs this so that main is the whole truth: after a push to
# main, no test app is left serving a test-* subdomain. The test target runs it
# too when nothing is marked `development: true`.
set -euo pipefail

cd "$(dirname "$0")/.."

removed=false

# The normal path: tear down the project as Compose knows it.
if [ -f docker-compose.test.yml ]; then
  docker compose -p mono-test -f docker-compose.test.yml down --remove-orphans || true
  rm -f docker-compose.test.yml
  removed=true
fi

# Belt and braces — catches containers whose compose file was already deleted,
# which Compose can no longer describe but which are still labelled.
leftover=$(docker ps -aq --filter "label=com.docker.compose.project=mono-test" || true)
if [ -n "$leftover" ]; then
  # shellcheck disable=SC2086
  docker rm -f $leftover
  removed=true
fi

if [ "$removed" = true ]; then
  echo "=== Test apps retired ==="
else
  echo "No test apps were running."
fi
