# SQL Bootstrap Notes

This folder is reserved for SQL scripts that will be introduced when switching `DataAccess:Provider` to `SqlServer`.

Conventions:
- Reads from PascalCase views with `View` suffix.
- Writes through business-named stored procedures (for example `AddLead`, `SaveLead`, `DeleteLead`).
