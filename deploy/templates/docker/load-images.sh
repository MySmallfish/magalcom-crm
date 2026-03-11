#!/usr/bin/env bash
set -euo pipefail

bundle_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
for image_archive in "${bundle_root}"/images/*.tar; do
  docker load -i "${image_archive}"
done
