# SQL Bootstrap Notes

The source-controlled SQL Server database project lives in `src/Database/Magalcom.Crm.Database.sqlproj`.

This folder contains local deployment helpers for Docker-based development.

Conventions:
- Reads come from source-controlled views such as `crm.ProjectView` and `crm.FormulaView`.
- Writes go through business-named stored procedures such as `crm.SaveProject` and `crm.SaveFormula`.
- The local compose stack publishes the dacpac by running `deploy/docker/sql/publish-local.sh` before `WebApi` and `Backend` start.
