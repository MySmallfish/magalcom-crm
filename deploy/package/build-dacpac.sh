#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${script_dir}/lib/common.sh"

output_dir="${1:-${repo_root}/artifacts/database}"
project_path="${repo_root}/src/Database/Magalcom.Crm.Database.sqlproj"
build_log="$(mktemp)"
trap 'rm -f "${build_log}"' EXIT

require_cmd "${dotnet_bin}"
mkdir -p "${output_dir}"

"${dotnet_bin}" build "${project_path}" -c Release >"${build_log}"
cat "${build_log}"

dacpac_source="$(find "${repo_root}/src/Database/bin/Release" -type f -name 'Magalcom.Crm.Database.dacpac' | head -n 1)"
if [ -z "${dacpac_source}" ]; then
  echo "Dacpac output was not found after build." >&2
  exit 1
fi

dacpac_target="${output_dir}/Magalcom.Crm.Database.dacpac"
cp "${dacpac_source}" "${dacpac_target}"
printf '%s\n' "${dacpac_target}"
