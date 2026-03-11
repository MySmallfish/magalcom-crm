---
name: magalcom-deployment
description: Use this skill when work involves deployment, release engineering, version bumping, package creation, Docker deployment bundles, IIS deployment bundles, Windows Service hosting, SQL dacpac packaging, or GitHub Actions deployment artifacts for this repository.
---

# Magalcom Deployment

Use this skill for deployment and release work in this repo. Keep the workflow tight and rely on the repo scripts instead of inventing one-off packaging commands.

## Workflow
1. Determine whether the change is deployable. If it touches `src/` or `deploy/`, treat it as deployable.
2. For deployable changes, bump `VersionPrefix` in `src/Directory.Build.props`.
3. Use the packaging scripts in `deploy/package/`:
   - `check-version-bump.sh`
   - `create-native-bundle.sh`
   - `create-docker-bundle.sh`
   - `validate-bundle.sh`
4. Keep both targets working:
   - native Windows bundle for IIS + Windows Service
   - docker Linux bundle for existing external SQL Server
5. When package structure changes, update the matching templates, workflow YAML, `deploy-manifest.json` contract, and deployment docs in the same change.
6. Prefer GitHub Actions as the authoritative execution path when local `.NET` tooling is unavailable.

## Required Outputs
- Native package: `magalcom-crm-native-win-x64-<version>.zip`
- Docker package: `magalcom-crm-docker-linux-amd64-<version>.tar.gz`
- Both packages must include:
  - `deploy-manifest.json`
  - SQL dacpac
  - environment/config templates
  - target-specific deployment scripts

## References
Read only the reference you need:
- Versioning and PR rules: [`references/versioning.md`](/Users/yair/dev/magalcom-crm/.codex/skills/magalcom-deployment/references/versioning.md)
- Native bundle layout and hosting model: [`references/native-bundle.md`](/Users/yair/dev/magalcom-crm/.codex/skills/magalcom-deployment/references/native-bundle.md)
- Docker bundle layout and deployment model: [`references/docker-bundle.md`](/Users/yair/dev/magalcom-crm/.codex/skills/magalcom-deployment/references/docker-bundle.md)
