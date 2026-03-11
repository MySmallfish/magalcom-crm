# AGENTS.md

## Deployment Skill
Use the repo-local `magalcom-deployment` skill at [`.codex/skills/magalcom-deployment/SKILL.md`](/Users/yair/dev/magalcom-crm/.codex/skills/magalcom-deployment/SKILL.md) whenever the task involves deployment, hosting, release engineering, version bumping, IIS, Windows Service packaging, Docker packaging, dacpac packaging, or GitHub Actions artifact workflows.

## Deployment Rules
- Deployable changes under `src/` or `deploy/` must bump `VersionPrefix` in [`src/Directory.Build.props`](/Users/yair/dev/magalcom-crm/src/Directory.Build.props).
- Every deployable PR must keep both deployment targets working:
  - native Windows bundle: `magalcom-crm-native-win-x64-<version>.zip`
  - docker bundle: `magalcom-crm-docker-linux-amd64-<version>.tar.gz`
- Package content changes must update scripts, templates, deployment manifests, GitHub workflows, and docs together.
- Prefer the repo packaging scripts under `deploy/package/` over ad hoc build and archive commands.
- Validate bundle structure with `deploy/package/validate-bundle.sh` whenever package contents or naming rules change.
- Do not remove one deployment target or downgrade artifact coverage without explicit user approval.

## PR Expectations
- GitHub Actions is the source of truth for deployment artifact generation.
- PR workflows must upload exactly two deployment artifacts: one native bundle and one docker bundle.
- Preview versions use `<VersionPrefix>-pr.<PR_NUMBER>.<RUN_NUMBER>`.
- Release builds use the committed `VersionPrefix` with no preview suffix.
- `deploy-manifest.json` must keep version, build kind, commit SHA, generated timestamp, service list, and database artifact path consistent with the produced package.
