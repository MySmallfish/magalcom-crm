# Docker Bundle

## Target
- Linux/amd64 hosts
- Containers for `WebApp`, `WebApi`, and `Backend`
- Existing external SQL Server
- No SQL container in deployment bundle

## Expected Package Layout
- `images/webapp.tar`
- `images/webapi.tar`
- `images/backend.tar`
- `docker-compose.yml`
- `.env.template`
- `database/Magalcom.Crm.Database.dacpac`
- `scripts/load-images.sh`
- `scripts/deploy.sh`
- `scripts/publish-database.sh`
- `deploy-manifest.json`

## Packaging Script
- Use `deploy/package/create-docker-bundle.sh`.
- Validate the produced archive with `deploy/package/validate-bundle.sh docker <archive> <version>`.
