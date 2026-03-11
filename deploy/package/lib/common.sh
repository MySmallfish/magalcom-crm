#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
artifacts_root="${repo_root}/artifacts/packages"
version_file="${repo_root}/src/Directory.Build.props"
dotnet_bin="${DOTNET_BIN:-dotnet}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command not found: $1" >&2
    exit 1
  fi
}

read_version_prefix() {
  local version_prefix
  version_prefix="$(sed -n 's:.*<VersionPrefix>\(.*\)</VersionPrefix>.*:\1:p' "${version_file}" | head -n 1)"
  if [ -z "${version_prefix}" ]; then
    echo "VersionPrefix was not found in ${version_file}." >&2
    exit 1
  fi

  echo "${version_prefix}"
}

compute_package_version() {
  if [ -n "${PACKAGE_VERSION:-}" ]; then
    echo "${PACKAGE_VERSION}"
    return
  fi

  local version_prefix
  version_prefix="$(read_version_prefix)"

  case "${BUILD_KIND:-release}" in
    release)
      echo "${version_prefix}"
      ;;
    pr-preview)
      : "${PR_NUMBER:?PR_NUMBER must be set when BUILD_KIND=pr-preview}"
      : "${RUN_NUMBER:?RUN_NUMBER must be set when BUILD_KIND=pr-preview}"
      echo "${version_prefix}-pr.${PR_NUMBER}.${RUN_NUMBER}"
      ;;
    *)
      echo "Unsupported BUILD_KIND: ${BUILD_KIND:-}" >&2
      exit 1
      ;;
  esac
}

get_commit_sha() {
  if [ -n "${COMMIT_SHA:-}" ]; then
    echo "${COMMIT_SHA}"
    return
  fi

  git -C "${repo_root}" rev-parse HEAD
}

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

prepare_stage_dir() {
  local target="$1"
  local version="$2"
  local stage_dir="${artifacts_root}/${target}/${version}"

  rm -rf "${stage_dir}"
  mkdir -p "${stage_dir}"
  echo "${stage_dir}"
}

copy_tree() {
  local source_dir="$1"
  local destination_dir="$2"

  mkdir -p "${destination_dir}"
  cp -R "${source_dir}/." "${destination_dir}/"
}
