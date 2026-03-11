# Versioning Rules

## Stable Source
- Stable versions come from `src/Directory.Build.props`.
- `VersionPrefix` is the only source of truth for release package versions.

## Preview Versions
- PR package version format: `<VersionPrefix>-pr.<PR_NUMBER>.<RUN_NUMBER>`.
- The same computed version must be used for:
  - native package filename
  - docker package filename
  - docker image tags
  - `deploy-manifest.json`
  - `.NET` publish version metadata

## Enforcement
- If a PR changes deployable paths under `src/` or `deploy/`, `VersionPrefix` must increase.
- Use `deploy/package/check-version-bump.sh <base-branch>` in automation and CI.
