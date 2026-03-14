using System.Text.RegularExpressions;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer.Internal;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerSqlQueryService(DataAccessOptions options) : SqlServerDataServiceBase(options), ISqlQueryService
{
    private const int MaxReadResultRows = 5000;

    private static readonly HashSet<string> WriteStatementTokens =
    [
        "INSERT",
        "UPDATE",
        "DELETE",
        "MERGE"
    ];

    private static readonly Regex StatementTokenRegex = new(
        @"(?is)^(?:\s+|--[^\r\n]*(?:\r\n|\n|$)|/\*[\s\S]*?\*/)*([a-zA-Z_][\w]*)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public async Task<SqlQueryResult> ExecuteAsync(SqlQueryRequest request, CancellationToken cancellationToken = default)
    {
        var sql = request.Sql?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(sql))
        {
            throw new ArgumentException("SQL is required.", nameof(request.Sql));
        }

        var kind = GetSqlStatementKind(sql);
        if (kind == SqlStatementKind.Unsupported)
        {
            throw new InvalidOperationException("Only SELECT and INSERT/UPDATE/DELETE/MERGE SQL statements are supported.");
        }

        var requiresWriteConsent = kind == SqlStatementKind.Write;
        if (requiresWriteConsent && !request.WriteConsent)
        {
            return new SqlQueryResult(
                false,
                true,
                [],
                [],
                0,
                "Write query requires explicit consent for the current session.");
        }

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);

        return kind == SqlStatementKind.Read
            ? await ExecuteReadAsync(command, cancellationToken)
            : await ExecuteWriteAsync(command, cancellationToken);
    }

    private static SqlStatementKind GetSqlStatementKind(string sql)
    {
        var match = StatementTokenRegex.Match(sql);
        if (!match.Success)
        {
            return SqlStatementKind.Unsupported;
        }

        var token = match.Groups[1].Value.ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(token))
        {
            return SqlStatementKind.Unsupported;
        }

        if (token is "SELECT" or "WITH")
        {
            return SqlStatementKind.Read;
        }

        if (WriteStatementTokens.Contains(token))
        {
            return SqlStatementKind.Write;
        }

        return SqlStatementKind.Unsupported;
    }

    private static async Task<SqlQueryResult> ExecuteReadAsync(SqlCommand command, CancellationToken cancellationToken)
    {
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var columns = new List<SqlQueryColumn>();
        for (var i = 0; i < reader.FieldCount; i += 1)
        {
            columns.Add(new SqlQueryColumn(reader.GetName(i), reader.GetDataTypeName(i)));
        }

        var rows = new List<SqlQueryRow>();
        var truncated = false;

        while (await reader.ReadAsync(cancellationToken))
        {
            if (rows.Count >= MaxReadResultRows)
            {
                truncated = true;
                break;
            }

            var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i += 1)
            {
                var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                values[reader.GetName(i)] = value;
            }

            rows.Add(new SqlQueryRow(values));
        }

        return new SqlQueryResult(
            true,
            false,
            columns,
            rows,
            0,
            truncated
                ? $"Results truncated to {MaxReadResultRows} rows."
                : null);
    }

    private static async Task<SqlQueryResult> ExecuteWriteAsync(SqlCommand command, CancellationToken cancellationToken)
    {
        var rowsAffected = await command.ExecuteNonQueryAsync(cancellationToken);

        return new SqlQueryResult(
            false,
            false,
            [],
            [],
            rowsAffected,
            null);
    }

    private enum SqlStatementKind
    {
        Unsupported,
        Read,
        Write
    }
}
