using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerFormulaDataService : IFormulaDataService
{
    public Task<IReadOnlyCollection<FormulaDto>> GetFormulasAsync(CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }

    public Task<FormulaDto?> SaveFormulaAsync(Guid formulaId, UpdateFormulaRequest request, CancellationToken cancellationToken = default)
    {
        throw new NotImplementedException("SQL Server implementation is enabled by configuration and completed at end of Stage 2.");
    }
}
