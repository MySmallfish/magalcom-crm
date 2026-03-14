using Magalcom.Crm.Shared.Contracts.Admin;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface ISqlQueryService
{
    Task<SqlQueryResult> ExecuteAsync(SqlQueryRequest request, CancellationToken cancellationToken = default);
}
