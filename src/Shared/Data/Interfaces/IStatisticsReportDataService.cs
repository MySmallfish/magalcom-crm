using Magalcom.Crm.Shared.Contracts.Leads;

namespace Magalcom.Crm.Shared.Data.Interfaces;

public interface IStatisticsReportDataService
{
    Task<IReadOnlyCollection<StatisticsReportEntryDto>> GetEntriesAsync(LeadQueryScope? scope = null, CancellationToken cancellationToken = default);
}
