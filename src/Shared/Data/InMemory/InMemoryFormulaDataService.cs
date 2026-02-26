using System.Collections.Concurrent;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemoryFormulaDataService : IFormulaDataService
{
    private readonly ConcurrentDictionary<Guid, FormulaDto> _formulas = new();

    public InMemoryFormulaDataService()
    {
        var formula = new FormulaDto(
            Guid.Parse("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
            "Default Forecast",
            "PotentialAmount * 0.42",
            true);

        _formulas[formula.Id] = formula;
    }

    public Task<IReadOnlyCollection<FormulaDto>> GetFormulasAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyCollection<FormulaDto>>(_formulas.Values.OrderBy(x => x.Name).ToArray());
    }

    public Task<FormulaDto?> SaveFormulaAsync(Guid formulaId, UpdateFormulaRequest request, CancellationToken cancellationToken = default)
    {
        if (!_formulas.TryGetValue(formulaId, out var existing))
        {
            return Task.FromResult<FormulaDto?>(null);
        }

        var updated = existing with
        {
            Name = request.Name,
            Expression = request.Expression,
            IsActive = request.IsActive
        };

        _formulas[formulaId] = updated;
        return Task.FromResult<FormulaDto?>(updated);
    }
}
