#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${script_dir}/lib/common.sh"

require_cmd "${dotnet_bin}"
require_cmd docker
require_cmd tar

package_version="$(compute_package_version)"
commit_sha="$(get_commit_sha)"
generated_at="$(timestamp_utc)"
stage_dir="$(prepare_stage_dir docker "${package_version}")"
bundle_dir="${stage_dir}/bundle"
database_build_dir="${stage_dir}/database-build"
archive_path="${stage_dir}/magalcom-crm-docker-linux-amd64-${package_version}.tar.gz"
webapp_image="magalcom-crm/webapp:${package_version}"
webapi_image="magalcom-crm/webapi:${package_version}"
backend_image="magalcom-crm/backend:${package_version}"

dacpac_path="$(${script_dir}/build-dacpac.sh "${database_build_dir}")"

mkdir -p "${bundle_dir}/images" "${bundle_dir}/database" "${bundle_dir}/scripts"
cp "${dacpac_path}" "${bundle_dir}/database/Magalcom.Crm.Database.dacpac"

docker build --platform linux/amd64 -f "${repo_root}/deploy/docker/Dockerfile.webapp" -t "${webapp_image}" "${repo_root}"
docker build --platform linux/amd64 -f "${repo_root}/deploy/docker/Dockerfile.webapi" -t "${webapi_image}" "${repo_root}"
docker build --platform linux/amd64 -f "${repo_root}/deploy/docker/Dockerfile.backend" -t "${backend_image}" "${repo_root}"

docker save "${webapp_image}" -o "${bundle_dir}/images/webapp.tar"
docker save "${webapi_image}" -o "${bundle_dir}/images/webapi.tar"
docker save "${backend_image}" -o "${bundle_dir}/images/backend.tar"

sed \
  -e "s#__WEBAPP_IMAGE__#${webapp_image}#g" \
  -e "s#__WEBAPI_IMAGE__#${webapi_image}#g" \
  -e "s#__BACKEND_IMAGE__#${backend_image}#g" \
  "${repo_root}/deploy/templates/docker/docker-compose.yml.template" > "${bundle_dir}/docker-compose.yml"

sed -e "s#__PACKAGE_VERSION__#${package_version}#g" "${repo_root}/deploy/templates/docker/.env.template" > "${bundle_dir}/.env.template"

cp "${repo_root}/deploy/templates/docker/load-images.sh" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/docker/deploy.sh" "${bundle_dir}/scripts/"
cp "${repo_root}/deploy/templates/docker/publish-database.sh" "${bundle_dir}/scripts/"

cat <<'MANIFEST' > "${bundle_dir}/deploy-manifest.json"
{
  "version": "__PACKAGE_VERSION__",
  "buildKind": "__BUILD_KIND__",
  "commitSha": "__COMMIT_SHA__",
  "generatedAtUtc": "__GENERATED_AT__",
  "services": ["WebApp", "WebApi", "Backend"],
  "dockerImages": [
    { "service": "WebApp", "image": "__WEBAPP_IMAGE__", "archive": "images/webapp.tar" },
    { "service": "WebApi", "image": "__WEBAPI_IMAGE__", "archive": "images/webapi.tar" },
    { "service": "Backend", "image": "__BACKEND_IMAGE__", "archive": "images/backend.tar" }
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
  -e "s#__WEBAPP_IMAGE__#${webapp_image}#g" \
  -e "s#__WEBAPI_IMAGE__#${webapi_image}#g" \
  -e "s#__BACKEND_IMAGE__#${backend_image}#g" \
  "${bundle_dir}/deploy-manifest.json"
rm -f "${bundle_dir}/deploy-manifest.json.bak"

(
  cd "${bundle_dir}"
  tar -czf "${archive_path}" .
)

"${script_dir}/validate-bundle.sh" docker "${archive_path}" "${package_version}"
printf '%s\n' "${archive_path}"
