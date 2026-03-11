using System.Data;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer.Internal;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerFormulaDataService(DataAccessOptions options) : SqlServerDataServiceBase(options), IFormulaDataService
{
    public async Task<IReadOnlyCollection<FormulaDto>> GetFormulasAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                [Id],
                [Name],
                [Expression],
                [IsActive]
            FROM [crm].[FormulaView]
            ORDER BY [Name], [Id];
            """;

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var formulas = new List<FormulaDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            formulas.Add(MapFormula(reader));
        }

        return formulas;
    }

    public async Task<FormulaDto?> SaveFormulaAsync(Guid formulaId, UpdateFormulaRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand("[crm].[SaveFormula]", connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@FormulaId", formulaId);
        command.Parameters.AddWithValue("@Name", request.Name);
        command.Parameters.AddWithValue("@Expression", request.Expression);
        command.Parameters.AddWithValue("@IsActive", request.IsActive);

        var wasUpdatedParameter = command.Parameters.Add("@WasUpdated", SqlDbType.Bit);
        wasUpdatedParameter.Direction = ParameterDirection.Output;

        await command.ExecuteNonQueryAsync(cancellationToken);

        var wasUpdated = wasUpdatedParameter.Value is bool value && value;
        if (!wasUpdated)
        {
            return null;
        }

        return await GetFormulaByIdAsync(connection, formulaId, cancellationToken);
    }

    private static FormulaDto MapFormula(SqlDataReader reader) =>
        new(
            reader.GetGuid("Id"),
            reader.GetString("Name"),
            reader.GetString("Expression"),
            reader.GetBoolean("IsActive"));

    private static async Task<FormulaDto?> GetFormulaByIdAsync(SqlConnection connection, Guid formulaId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                [Id],
                [Name],
                [Expression],
                [IsActive]
            FROM [crm].[FormulaView]
            WHERE [Id] = @FormulaId;
            """;

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@FormulaId", formulaId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapFormula(reader);
    }
}
