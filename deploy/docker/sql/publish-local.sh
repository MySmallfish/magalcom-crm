#!/usr/bin/env bash
set -euo pipefail

workspace_dir="${WORKSPACE_DIR:-/workspace}"
project_path="${workspace_dir}/src/Database/Magalcom.Crm.Database.sqlproj"
tool_dir="${SQLPACKAGE_TOOL_DIR:-/tmp/sqlpackage}"
connection_string="${TARGET_CONNECTION_STRING:?TARGET_CONNECTION_STRING must be set}"

if [ ! -d "${workspace_dir}" ]; then
  echo "Workspace directory '${workspace_dir}' was not found."
  exit 1
fi

dotnet tool update --tool-path "${tool_dir}" microsoft.sqlpackage >/dev/null 2>&1 \
  || dotnet tool install --tool-path "${tool_dir}" microsoft.sqlpackage >/dev/null

dotnet build "${project_path}" -c Release >/tmp/magalcom-db-build.log
cat /tmp/magalcom-db-build.log

dacpac_path="$(find "${workspace_dir}/src/Database/bin/Release" -name 'Magalcom.Crm.Database.dacpac' | head -n 1)"
if [ -z "${dacpac_path}" ]; then
  echo "The database build did not produce a dacpac."
  exit 1
fi

attempt=1
max_attempts=30

until "${tool_dir}/sqlpackage" \
  /Action:Publish \
  /SourceFile:"${dacpac_path}" \
  /TargetConnectionString:"${connection_string}" \
  /p:CreateNewDatabase=True \
  /p:BlockOnPossibleDataLoss=False \
  /p:DropObjectsNotInSource=False; do
  if [ "${attempt}" -ge "${max_attempts}" ]; then
    echo "Failed to publish the dacpac after ${max_attempts} attempts."
    exit 1
  fi

  attempt=$((attempt + 1))
  sleep 2
done
