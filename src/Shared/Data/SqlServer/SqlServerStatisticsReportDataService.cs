using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer.Internal;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerStatisticsReportDataService(DataAccessOptions options)
    : SqlServerDataServiceBase(options), IStatisticsReportDataService
{
    public async Task<IReadOnlyCollection<StatisticsReportEntryDto>> GetEntriesAsync(LeadQueryScope? scope = null, CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                [Id],
                [SalesPersonSubjectId],
                [SalesPersonDisplayName],
                [SalesPersonEmail],
                [EntryDate],
                [ProjectedAmount],
                [ActualAmount]
            FROM [crm].[StatisticsReportEntryView]
            WHERE (@CanViewAll = 1 OR [SalesPersonSubjectId] = @SubjectId)
            ORDER BY [EntryDate], [SalesPersonDisplayName], [Id];
            """;

        scope ??= LeadQueryScope.All;

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@CanViewAll", scope.CanViewAll);
        command.Parameters.AddWithValue("@SubjectId", (object?)scope.SubjectId ?? DBNull.Value);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        var entries = new List<StatisticsReportEntryDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            entries.Add(new StatisticsReportEntryDto(
                reader.GetGuid(reader.GetOrdinal("Id")),
                new LeadOwnerDto(
                    reader.GetString(reader.GetOrdinal("SalesPersonSubjectId")),
                    reader.GetString(reader.GetOrdinal("SalesPersonDisplayName")),
                    reader.GetString(reader.GetOrdinal("SalesPersonEmail"))),
                DateOnly.FromDateTime(reader.GetDateTime(reader.GetOrdinal("EntryDate"))),
                reader.GetDecimal(reader.GetOrdinal("ProjectedAmount")),
                reader.GetDecimal(reader.GetOrdinal("ActualAmount"))));
        }

        return entries;
    }
}
