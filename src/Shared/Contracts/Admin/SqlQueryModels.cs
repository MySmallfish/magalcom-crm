namespace Magalcom.Crm.Shared.Contracts.Admin;

public sealed record SqlQueryRequest(
    string Sql,
    bool WriteConsent);

public sealed record SqlQueryResult(
    bool IsReadOnly,
    bool RequiresWriteConsent,
    IReadOnlyList<SqlQueryColumn> Columns,
    IReadOnlyList<SqlQueryRow> Rows,
    int RowsAffected,
    string? Message);

public sealed record SqlQueryColumn(
    string Name,
    string DataType);

public sealed record SqlQueryRow(
    IReadOnlyDictionary<string, object?> Values);
