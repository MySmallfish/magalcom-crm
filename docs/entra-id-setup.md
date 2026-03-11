# Microsoft Entra ID Setup

This solution uses:

- a public SPA app registration for the shell
- a protected API app registration for `WebApi`
- delegated API access from the SPA to the API
- app roles on the API for authorization

No client secret is required for the current shell + API architecture.

## Prerequisites

Run the commands in Azure Cloud Shell as a user that can:

- create app registrations and enterprise applications
- grant admin consent
- create groups and assign group members
- assign enterprise app roles

## Cloud Shell commands

Paste the block below into Azure Cloud Shell:

```bash
set -euo pipefail

PREFIX="magalcom-crm"
WEBAPP_BASE_URL="http://localhost:7001"

TENANT_ID="$(az account show --query tenantId -o tsv)"
CURRENT_USER_ID="$(az ad signed-in-user show --query id -o tsv)"

CRM_USER_ROLE_ID="$(cat /proc/sys/kernel/random/uuid)"
ADMIN_ROLE_ID="$(cat /proc/sys/kernel/random/uuid)"
ACCESS_SCOPE_ID="$(cat /proc/sys/kernel/random/uuid)"

cat > api-app-roles.json <<EOF
[
  {
    "allowedMemberTypes": ["User"],
    "description": "Standard Magalcom CRM access.",
    "displayName": "CRM User",
    "id": "$CRM_USER_ROLE_ID",
    "isEnabled": true,
    "origin": "Application",
    "value": "CrmUser"
  },
  {
    "allowedMemberTypes": ["User"],
    "description": "Administrative Magalcom CRM access.",
    "displayName": "Admin",
    "id": "$ADMIN_ROLE_ID",
    "isEnabled": true,
    "origin": "Application",
    "value": "Admin"
  }
]
EOF

API_APP_JSON="$(az ad app create \
  --display-name "${PREFIX}-api" \
  --sign-in-audience AzureADMyOrg \
  --app-roles @api-app-roles.json \
  --query "{appId:appId,id:id}" -o json)"

API_APP_CLIENT_ID="$(echo "$API_APP_JSON" | jq -r '.appId')"
API_APP_OBJECT_ID="$(echo "$API_APP_JSON" | jq -r '.id')"

cat > api-app-patch.json <<EOF
{
  "identifierUris": [
    "api://$API_APP_CLIENT_ID"
  ],
  "api": {
    "requestedAccessTokenVersion": 2,
    "oauth2PermissionScopes": [
      {
        "adminConsentDescription": "Access Magalcom CRM API as the signed-in user.",
        "adminConsentDisplayName": "Access Magalcom CRM API",
        "id": "$ACCESS_SCOPE_ID",
        "isEnabled": true,
        "type": "User",
        "userConsentDescription": "Access Magalcom CRM API on your behalf.",
        "userConsentDisplayName": "Access Magalcom CRM API",
        "value": "access_as_user"
      }
    ]
  }
}
EOF

az rest \
  --method PATCH \
  --url "https://graph.microsoft.com/v1.0/applications/$API_APP_OBJECT_ID" \
  --headers 'Content-Type=application/json' \
  --body @api-app-patch.json >/dev/null

SPA_APP_JSON="$(az ad app create \
  --display-name "${PREFIX}-spa" \
  --sign-in-audience AzureADMyOrg \
  --query "{appId:appId,id:id}" -o json)"

SPA_APP_CLIENT_ID="$(echo "$SPA_APP_JSON" | jq -r '.appId')"
SPA_APP_OBJECT_ID="$(echo "$SPA_APP_JSON" | jq -r '.id')"

cat > spa-app-patch.json <<EOF
{
  "spa": {
    "redirectUris": [
      "$WEBAPP_BASE_URL/",
      "$WEBAPP_BASE_URL"
    ]
  }
}
EOF

az rest \
  --method PATCH \
  --url "https://graph.microsoft.com/v1.0/applications/$SPA_APP_OBJECT_ID" \
  --headers 'Content-Type=application/json' \
  --body @spa-app-patch.json >/dev/null

sleep 15

API_SP_OBJECT_ID="$(az ad sp create --id "$API_APP_CLIENT_ID" --query id -o tsv)"
SPA_SP_OBJECT_ID="$(az ad sp create --id "$SPA_APP_CLIENT_ID" --query id -o tsv)"

az ad app permission add \
  --id "$SPA_APP_CLIENT_ID" \
  --api "$API_APP_CLIENT_ID" \
  --api-permissions "$ACCESS_SCOPE_ID=Scope"

az ad app permission admin-consent --id "$SPA_APP_CLIENT_ID"

CRM_USERS_GROUP_ID="$(az ad group create \
  --display-name "Magalcom CRM Users" \
  --mail-nickname "magalcom-crm-users" \
  --query id -o tsv)"

CRM_ADMINS_GROUP_ID="$(az ad group create \
  --display-name "Magalcom CRM Admins" \
  --mail-nickname "magalcom-crm-admins" \
  --query id -o tsv)"

az ad group member add --group "$CRM_USERS_GROUP_ID" --member-id "$CURRENT_USER_ID"
az ad group member add --group "$CRM_ADMINS_GROUP_ID" --member-id "$CURRENT_USER_ID"

cat > crm-user-role-assignment.json <<EOF
{
  "principalId": "$CRM_USERS_GROUP_ID",
  "resourceId": "$API_SP_OBJECT_ID",
  "appRoleId": "$CRM_USER_ROLE_ID"
}
EOF

az rest \
  --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$API_SP_OBJECT_ID/appRoleAssignedTo" \
  --headers 'Content-Type=application/json' \
  --body @crm-user-role-assignment.json >/dev/null

cat > crm-admin-role-assignment.json <<EOF
{
  "principalId": "$CRM_ADMINS_GROUP_ID",
  "resourceId": "$API_SP_OBJECT_ID",
  "appRoleId": "$ADMIN_ROLE_ID"
}
EOF

az rest \
  --method POST \
  --url "https://graph.microsoft.com/v1.0/servicePrincipals/$API_SP_OBJECT_ID/appRoleAssignedTo" \
  --headers 'Content-Type=application/json' \
  --body @crm-admin-role-assignment.json >/dev/null

cat <<EOF

Copy these values into the appsettings files:

src/WebApp/appsettings.json
  Shell:Authentication:Entra:TenantId=$TENANT_ID
  Shell:Authentication:Entra:SpaClientId=$SPA_APP_CLIENT_ID
  Shell:Authentication:Entra:Scope=api://$API_APP_CLIENT_ID/access_as_user
  Shell:Authentication:Entra:RedirectUri=$WEBAPP_BASE_URL/
  Shell:Authentication:Entra:PostLogoutRedirectUri=$WEBAPP_BASE_URL/

src/WebApi/appsettings.json
  Authentication:Entra:TenantId=$TENANT_ID
  Authentication:Entra:ApiClientId=$API_APP_CLIENT_ID
  Authentication:Entra:Audience=api://$API_APP_CLIENT_ID

Created identities
  SPA app client id: $SPA_APP_CLIENT_ID
  API app client id: $API_APP_CLIENT_ID
  API service principal object id: $API_SP_OBJECT_ID
  CRM Users group id: $CRM_USERS_GROUP_ID
  CRM Admins group id: $CRM_ADMINS_GROUP_ID

EOF
```

## Notes

- The API requires one of the API app roles `CrmUser` or `Admin` for all `/api/v1/*` endpoints and SignalR hub access.
- The `Admin` role is required for `/api/v1/admin/*`.
- If you use a different local port or hostname, change `WEBAPP_BASE_URL` before running the script and update `Cors:AllowedOrigins` in `src/WebApi/appsettings.json`.

## References

- [Tutorial: Register a single-page application](https://learn.microsoft.com/en-us/entra/identity-platform/tutorial-single-page-app-react-register-app)
- [Tutorial: Register a web API](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-configure-app-expose-web-apis)
- [Azure CLI `az ad app` reference](https://learn.microsoft.com/en-us/cli/azure/ad/app?view=azure-cli-latest)
- [Azure CLI `az ad app permission` reference](https://learn.microsoft.com/en-us/cli/azure/ad/app/permission?view=azure-cli-latest)
- [Microsoft Graph application resource type](https://learn.microsoft.com/en-us/graph/api/resources/application?view=graph-rest-1.0)
