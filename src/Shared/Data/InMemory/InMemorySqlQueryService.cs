using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemorySqlQueryService : ISqlQueryService
{
    public Task<SqlQueryResult> ExecuteAsync(SqlQueryRequest request, CancellationToken cancellationToken = default)
    {
        throw new InvalidOperationException("SQL query execution is only available when DataAccess:Provider is SqlServer.");
    }
}
