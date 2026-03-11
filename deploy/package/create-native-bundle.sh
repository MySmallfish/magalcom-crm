#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${script_dir}/lib/common.sh"

require_cmd "${dotnet_bin}"
require_cmd zip
require_cmd unzip

package_version="$(compute_package_version)"
commit_sha="$(get_commit_sha)"
generated_at="$(timestamp_utc)"
stage_dir="$(prepare_stage_dir native "${package_version}")"
bundle_dir="${stage_dir}/bundle"
database_build_dir="${stage_dir}/database-build"
archive_path="${stage_dir}/magalcom-crm-native-win-x64-${package_version}.zip"

dacpac_path="$(${script_dir}/build-dacpac.sh "${database_build_dir}")"

mkdir -p "${bundle_dir}/webapp" "${bundle_dir}/webapi" "${bundle_dir}/backend" "${bundle_dir}/database" "${bundle_dir}/config" "${bundle_dir}/scripts"
cp "${dacpac_path}" "${bundle_dir}/database/Magalcom.Crm.Database.dacpac"

"${dotnet_bin}" publish "${repo_root}/src/WebApp/WebApp.csproj" -c Release -r win-x64 --self-contained false -p:Version="${package_version}" -p:InformationalVersion="${package_version}" -o "${bundle_dir}/webapp"
"${dotnet_bin}" publish "${repo_root}/src/WebApi/WebApi.csproj" -c Release -r win-x64 --self-contained false -p:Version="${package_version}" -p:InformationalVersion="${package_version}" -o "${bundle_dir}/webapi"
"${dotnet_bin}" publish "${repo_root}/src/Backend/Backend.csproj" -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -p:PublishTrimmed=false -p:Version="${package_version}" -p:InformationalVersion="${package_version}" -o "${bundle_dir}/backend"

cp "${repo_root}/deploy/templates/native/install-iis-site.ps1" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/native/install-backend-service.ps1" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/native/publish-database.ps1" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/native/install-native.ps1" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/native/appsettings.WebApp.Production.template.json" "${bundle_dir}/config/"
cp "${repo_root}/deploy/templates/native/appsettings.WebApi.Production.template.json" "${bundle_dir}/config/"
cp "${repo_root}/deploy/templates/native/appsettings.Backend.Production.template.json" "${bundle_dir}/config/"

cat <<'MANIFEST' > "${bundle_dir}/deploy-manifest.json"
{
  "version": "__PACKAGE_VERSION__",
  "buildKind": "__BUILD_KIND__",
  "commitSha": "__COMMIT_SHA__",
  "generatedAtUtc": "__GENERATED_AT__",
  "services": ["WebApp", "WebApi", "Backend"],
  "nativeServices": [
    { "service": "WebApp", "host": "IIS", "path": "webapp" },
    { "service": "WebApi", "host": "IIS", "path": "webapi" },
    { "service": "Backend", "host": "WindowsService", "path": "backend" }
  ],
  "databaseArtifact": {
    "dacpac": "database/Magalcom.Crm.Database.dacpac"
  }
}
MANIFEST

sed -i.bak \
  -e "s#__PACKAGE_VERSION__#${package_version}#g" \
  -e "s#__BUILD_KIND__#${BUILD_KIND:-release}#g" \
  -e "s#__COMMIT_SHA__#${commit_sha}#g" \
  -e "s#__GENERATED_AT__#${generated_at}#g" \
  "${bundle_dir}/deploy-manifest.json"
rm -f "${bundle_dir}/deploy-manifest.json.bak"

(
  cd "${bundle_dir}"
  zip -qr "${archive_path}" .
)

"${script_dir}/validate-bundle.sh" native "${archive_path}" "${package_version}"
printf '%s\n' "${archive_path}"
