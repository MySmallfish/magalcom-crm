#!/usr/bin/env bash
set -euo pipefail

bundle_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dacpac_path="${bundle_root}/database/Magalcom.Crm.Database.dacpac"
sqlpackage_bin="${SQLPACKAGE_BIN:-sqlpackage}"
connection_string="${TARGET_CONNECTION_STRING:?TARGET_CONNECTION_STRING must be set}"

if [ ! -f "${dacpac_path}" ]; then
  echo "Dacpac not found: ${dacpac_path}" >&2
  exit 1
fi

"${sqlpackage_bin}" /Action:Publish /SourceFile:"${dacpac_path}" /TargetConnectionString:"${connection_string}" /p:CreateNewDatabase=True /p:BlockOnPossibleDataLoss=False /p:DropObjectsNotInSource=False
