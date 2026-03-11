#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${script_dir}/lib/common.sh"

base_ref="${1:?Base branch name is required}"
git -C "${repo_root}" fetch origin "${base_ref}" --depth=1 >/dev/null 2>&1 || true
changed_files="$(git -C "${repo_root}" diff --name-only "origin/${base_ref}"...HEAD)"

if [ -z "${changed_files}" ]; then
  echo "No changed files detected against origin/${base_ref}."
  exit 0
fi

if ! printf '%s\n' "${changed_files}" | grep -Eq '^(src/|deploy/)'; then
  echo "No deployable files changed; VersionPrefix bump is not required."
  exit 0
fi

head_version="$(read_version_prefix)"
base_version="$(git -C "${repo_root}" show "origin/${base_ref}:src/Directory.Build.props" 2>/dev/null | sed -n 's:.*<VersionPrefix>\(.*\)</VersionPrefix>.*:\1:p' | head -n 1)"

if [ -z "${base_version}" ]; then
  echo "Could not read VersionPrefix from origin/${base_ref}; require src/Directory.Build.props to be updated in this PR." >&2
  if ! printf '%s\n' "${changed_files}" | grep -Fxq 'src/Directory.Build.props'; then
    exit 1
  fi
fi

if [ -n "${base_version}" ] && [ "${head_version}" = "${base_version}" ]; then
  echo "Deployable changes require a VersionPrefix bump in src/Directory.Build.props." >&2
  exit 1
fi

echo "VersionPrefix check passed: ${base_version:-<missing>} -> ${head_version}"
