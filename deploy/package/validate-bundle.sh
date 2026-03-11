#!/usr/bin/env bash
set -euo pipefail

target="${1:?Target is required (native|docker)}"
archive_path="${2:?Archive path is required}"
expected_version="${3:?Expected version is required}"

work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

case "${archive_path}" in
  *.zip)
    unzip -q "${archive_path}" -d "${work_dir}"
    ;;
  *.tar.gz)
    tar -xzf "${archive_path}" -C "${work_dir}"
    ;;
  *)
    echo "Unsupported archive format: ${archive_path}" >&2
    exit 1
    ;;
esac

manifest_path="${work_dir}/deploy-manifest.json"
if [ ! -f "${manifest_path}" ]; then
  echo "deploy-manifest.json is missing from ${archive_path}." >&2
  exit 1
fi

if ! grep -q '"version": "'"${expected_version}"'"' "${manifest_path}"; then
  echo "Manifest version does not match ${expected_version}." >&2
  exit 1
fi

if [ ! -f "${work_dir}/database/Magalcom.Crm.Database.dacpac" ]; then
  echo "Database dacpac is missing from ${archive_path}." >&2
  exit 1
fi

case "${target}" in
  native)
    [ -f "${work_dir}/webapp/web.config" ] || { echo "Native bundle is missing webapp/web.config." >&2; exit 1; }
    [ -f "${work_dir}/webapi/web.config" ] || { echo "Native bundle is missing webapi/web.config." >&2; exit 1; }
    [ -f "${work_dir}/backend/Magalcom.Crm.Backend.exe" ] || { echo "Native bundle is missing Backend Windows Service executable." >&2; exit 1; }
    [ -f "${work_dir}/config/appsettings.WebApp.Production.template.json" ] || { echo "Native bundle is missing WebApp config template." >&2; exit 1; }
    [ -f "${work_dir}/scripts/install-native.ps1" ] || { echo "Native bundle is missing install-native.ps1." >&2; exit 1; }
    ;;
  docker)
    [ -f "${work_dir}/images/webapp.tar" ] || { echo "Docker bundle is missing webapp image archive." >&2; exit 1; }
    [ -f "${work_dir}/images/webapi.tar" ] || { echo "Docker bundle is missing webapi image archive." >&2; exit 1; }
    [ -f "${work_dir}/images/backend.tar" ] || { echo "Docker bundle is missing backend image archive." >&2; exit 1; }
    [ -f "${work_dir}/docker-compose.yml" ] || { echo "Docker bundle is missing docker-compose.yml." >&2; exit 1; }
    [ -f "${work_dir}/.env.template" ] || { echo "Docker bundle is missing .env.template." >&2; exit 1; }
    [ -f "${work_dir}/scripts/load-images.sh" ] || { echo "Docker bundle is missing load-images.sh." >&2; exit 1; }
    ;;
  *)
    echo "Unsupported target: ${target}" >&2
    exit 1
    ;;
esac

echo "Validated ${target} bundle: ${archive_path}"
