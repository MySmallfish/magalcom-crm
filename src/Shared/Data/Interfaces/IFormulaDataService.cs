using Magalcom.Crm.Shared.Contracts.Admin;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface IFormulaDataService
{
    Task<IReadOnlyCollection<FormulaDto>> GetFormulasAsync(CancellationToken cancellationToken = default);
    Task<FormulaDto?> SaveFormulaAsync(Guid formulaId, UpdateFormulaRequest request, CancellationToken cancellationToken = default);
}
