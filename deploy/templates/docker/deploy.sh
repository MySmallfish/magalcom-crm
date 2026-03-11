#!/usr/bin/env bash
set -euo pipefail

bundle_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-${bundle_root}/.env}"

if [ ! -f "${env_file}" ]; then
  echo "Environment file not found: ${env_file}" >&2
  exit 1
fi

"${bundle_root}/scripts/load-images.sh"
docker compose --env-file "${env_file}" -f "${bundle_root}/docker-compose.yml" up -d
