using System.Collections.Concurrent;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Leads;

namespace Magalcom.Crm.Shared.Data.InMemory;

public sealed class InMemoryLeadDataService : ILeadDataService
{
    private readonly object _sync = new();
    private readonly ConcurrentDictionary<Guid, LeadDto> _leads = new();
    private readonly ConcurrentDictionary<Guid, LeadCustomerDto> _customers = new();
    private readonly ConcurrentDictionary<Guid, LeadProjectDto> _projects = new();
    private readonly ConcurrentDictionary<Guid, WorkTypeDto> _workTypes = new();
    private readonly IReadOnlyCollection<QualificationQuestionDefinitionDto> _qualificationQuestions;
    private readonly IReadOnlyCollection<StageCoefficientDto> _stageCoefficients;

    public InMemoryLeadDataService()
    {
        _qualificationQuestions = LeadCalculationService.GetDefaultQuestions();
        _stageCoefficients = LeadCalculationService.GetDefaultStageCoefficients();

        SeedReferenceData();
        SeedLeads();
    }

    public Task<LeadModuleMetadataDto> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        var metadata = new LeadModuleMetadataDto(
            _customers.Values.OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            _projects.Values.OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            _workTypes.Values.OrderBy(item => item.SortOrder).ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            _qualificationQuestions,
            _stageCoefficients);

        return Task.FromResult(metadata);
    }

    public Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyCollection<LeadDto>>(
            _leads.Values
                .OrderByDescending(item => item.UpdatedAtUtc)
                .ThenBy(item => item.Customer.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray());
    }

    public Task<LeadDto?> GetLeadByIdAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        _leads.TryGetValue(leadId, out var lead);
        return Task.FromResult(lead);
    }

    public Task<LeadDto> AddLeadAsync(CreateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            var now = DateTime.UtcNow;
            var lead = BuildLead(
                Guid.NewGuid(),
                actor,
                request.CustomerId,
                request.ProjectId,
                request.ProjectName,
                request.Comments,
                request.QualificationAnswers,
                request.Stage,
                request.IsPerpetual,
                request.DueDate,
                request.OfferStatus,
                request.ActualAwardedAmount,
                request.AmountLines,
                now,
                now,
                [],
                actor,
                "Created",
                "Lead created");

            _leads[lead.Id] = lead;
            return Task.FromResult(lead);
        }
    }

    public Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            if (!_leads.TryGetValue(leadId, out var existing))
            {
                return Task.FromResult<LeadDto?>(null);
            }

            var updated = BuildLead(
                leadId,
                existing.Owner,
                request.CustomerId,
                request.ProjectId,
                request.ProjectName,
                request.Comments,
                request.QualificationAnswers,
                request.Stage,
                request.IsPerpetual,
                request.DueDate,
                request.OfferStatus,
                request.ActualAwardedAmount,
                request.AmountLines,
                existing.CreatedAtUtc,
                DateTime.UtcNow,
                existing.AuditTrail,
                actor,
                "Updated",
                "Lead updated");

            _leads[leadId] = updated;
            return Task.FromResult<LeadDto?>(updated);
        }
    }

    public Task<IReadOnlyCollection<WorkTypeDto>> GetWorkTypesAsync(CancellationToken cancellationToken = default)
    {
        return Task.FromResult<IReadOnlyCollection<WorkTypeDto>>(
            _workTypes.Values
                .OrderBy(item => item.SortOrder)
                .ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase)
                .ToArray());
    }

    public Task<WorkTypeDto> AddWorkTypeAsync(CreateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            ValidateWorkTypeRequest(request.Code, request.Name, request.SortOrder);
            EnsureUniqueWorkTypeCode(request.Code, null);

            var workType = new WorkTypeDto(
                Guid.NewGuid(),
                request.Code.Trim(),
                request.Name.Trim(),
                request.SortOrder,
                request.IsActive);

            _workTypes[workType.Id] = workType;
            return Task.FromResult(workType);
        }
    }

    public Task<WorkTypeDto?> SaveWorkTypeAsync(Guid workTypeId, UpdateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            if (!_workTypes.TryGetValue(workTypeId, out var existing))
            {
                return Task.FromResult<WorkTypeDto?>(null);
            }

            ValidateWorkTypeRequest(request.Code, request.Name, request.SortOrder);
            EnsureUniqueWorkTypeCode(request.Code, workTypeId);

            var updated = existing with
            {
                Code = request.Code.Trim(),
                Name = request.Name.Trim(),
                SortOrder = request.SortOrder,
                IsActive = request.IsActive
            };

            _workTypes[workTypeId] = updated;
            return Task.FromResult<WorkTypeDto?>(updated);
        }
    }

    public Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_leads.TryRemove(leadId, out _));
    }

    private void SeedReferenceData()
    {
        var customers = new[]
        {
            new LeadCustomerDto(Guid.Parse("c1111111-1111-1111-1111-111111111111"), "Contoso Security", "CRM-C-1001"),
            new LeadCustomerDto(Guid.Parse("c2222222-2222-2222-2222-222222222222"), "Fabrikam Energy", "CRM-C-1002"),
            new LeadCustomerDto(Guid.Parse("c3333333-3333-3333-3333-333333333333"), "Northwind Logistics", "CRM-C-1003")
        };

        foreach (var customer in customers)
        {
            _customers[customer.Id] = customer;
        }

        var workTypes = new[]
        {
            new WorkTypeDto(Guid.Parse("d1111111-1111-1111-1111-111111111111"), "DataCenter", "Data Center", 10, true),
            new WorkTypeDto(Guid.Parse("d2222222-2222-2222-2222-222222222222"), "Security", "Security", 20, true),
            new WorkTypeDto(Guid.Parse("d3333333-3333-3333-3333-333333333333"), "Safety", "Safety", 30, true),
            new WorkTypeDto(Guid.Parse("d4444444-4444-4444-4444-444444444444"), "Multimedia", "Multimedia", 40, true),
            new WorkTypeDto(Guid.Parse("d5555555-5555-5555-5555-555555555555"), "Transport", "Transport", 50, true),
            new WorkTypeDto(Guid.Parse("d6666666-6666-6666-6666-666666666666"), "Communications", "Communications", 60, true)
        };

        foreach (var workType in workTypes)
        {
            _workTypes[workType.Id] = workType;
        }

        var projects = new[]
        {
            new LeadProjectDto(Guid.Parse("e1111111-1111-1111-1111-111111111111"), customers[0].Id, "Airport Phase 1", true),
            new LeadProjectDto(Guid.Parse("e2222222-2222-2222-2222-222222222222"), customers[1].Id, "Substation Retrofit", true),
            new LeadProjectDto(Guid.Parse("e3333333-3333-3333-3333-333333333333"), customers[2].Id, "Warehouse Upgrade", true)
        };

        foreach (var project in projects)
        {
            _projects[project.Id] = project;
        }
    }

    private void SeedLeads()
    {
        var owner = new LeadOwnerDto("dev-user-001", "Development User", "developer@magalcom.local");
        var request = new CreateLeadRequest(
            Guid.Parse("c1111111-1111-1111-1111-111111111111"),
            Guid.Parse("e1111111-1111-1111-1111-111111111111"),
            string.Empty,
            "Initial seeded opportunity from CRM shell scaffold.",
            new[]
            {
                new LeadQualificationAnswerRequest("knows-customer-personally", true),
                new LeadQualificationAnswerRequest("returning-customer", true),
                new LeadQualificationAnswerRequest("involved-in-planning", true),
                new LeadQualificationAnswerRequest("consultant-relationship", false),
                new LeadQualificationAnswerRequest("project-management-relationship", true),
                new LeadQualificationAnswerRequest("customer-under-price-list", false)
            },
            LeadStage.Approaching,
            false,
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            LeadOfferStatus.Open,
            null,
            new[]
            {
                new LeadAmountLineRequest(Guid.Parse("f1111111-1111-1111-1111-111111111111"), Guid.Parse("d1111111-1111-1111-1111-111111111111"), 45000m, "Data center infrastructure"),
                new LeadAmountLineRequest(Guid.Parse("f2222222-2222-2222-2222-222222222222"), Guid.Parse("d6666666-6666-6666-6666-666666666666"), 12000m, "Communications integration")
            });

        var lead = BuildLead(
            Guid.Parse("11111111-1111-1111-1111-111111111111"),
            owner,
            request.CustomerId,
            request.ProjectId,
            request.ProjectName,
            request.Comments,
            request.QualificationAnswers,
            request.Stage,
            request.IsPerpetual,
            request.DueDate,
            request.OfferStatus,
            request.ActualAwardedAmount,
            request.AmountLines,
            DateTime.UtcNow.AddDays(-14),
            DateTime.UtcNow.AddDays(-1),
            [],
            owner,
            "Seeded",
            "Lead seeded for development");

        _leads[lead.Id] = lead;
    }

    private LeadDto BuildLead(
        Guid leadId,
        LeadOwnerDto owner,
        Guid customerId,
        Guid? projectId,
        string projectName,
        string comments,
        IReadOnlyCollection<LeadQualificationAnswerRequest> qualificationAnswers,
        LeadStage? stage,
        bool? isPerpetual,
        DateOnly? dueDate,
        LeadOfferStatus offerStatus,
        decimal? actualAwardedAmount,
        IReadOnlyCollection<LeadAmountLineRequest> amountLines,
        DateTime createdAtUtc,
        DateTime updatedAtUtc,
        IReadOnlyCollection<LeadAuditEntryDto> existingAuditTrail,
        LeadOwnerDto actor,
        string auditAction,
        string auditSummary)
    {
        if (!_customers.TryGetValue(customerId, out var customer))
        {
            throw new ArgumentException("Customer must exist in CRM master data.", nameof(customerId));
        }

        if (actualAwardedAmount is < 0m)
        {
            throw new ArgumentException("Actual awarded amount cannot be negative.", nameof(actualAwardedAmount));
        }

        var project = ResolveProject(customerId, projectId, projectName);
        var normalizedAnswers = NormalizeQualificationAnswers(qualificationAnswers);
        var normalizedLines = NormalizeAmountLines(amountLines);
        var calculation = LeadCalculationService.Compute(
            normalizedAnswers,
            stage,
            isPerpetual,
            dueDate,
            offerStatus,
            actualAwardedAmount,
            normalizedLines);

        var auditTrail = existingAuditTrail
            .Concat(
            [
                new LeadAuditEntryDto(
                    updatedAtUtc,
                    actor.DisplayName,
                    auditAction,
                    auditSummary)
            ])
            .OrderBy(item => item.ChangedAtUtc)
            .ToArray();

        return new LeadDto(
            leadId,
            owner,
            customer,
            project,
            SanitizeComments(comments),
            normalizedAnswers,
            stage,
            isPerpetual,
            dueDate,
            offerStatus,
            actualAwardedAmount,
            normalizedLines,
            calculation.Metrics,
            calculation.IsIncomplete,
            calculation.MissingFields,
            calculation.AmountTotalsByWorkType,
            auditTrail,
            createdAtUtc,
            updatedAtUtc);
    }

    private LeadProjectDto ResolveProject(Guid customerId, Guid? projectId, string projectName)
    {
        if (projectId.HasValue)
        {
            if (!_projects.TryGetValue(projectId.Value, out var existingProject) || existingProject.CustomerId != customerId)
            {
                throw new ArgumentException("Project must belong to the selected customer.", nameof(projectId));
            }

            return existingProject;
        }

        var sanitizedName = NormalizeProjectName(projectName);
        if (string.IsNullOrWhiteSpace(sanitizedName))
        {
            throw new ArgumentException("Project is required.", nameof(projectName));
        }

        var existing = _projects.Values.FirstOrDefault(item =>
            item.CustomerId == customerId
            && string.Equals(NormalizeProjectName(item.Name), sanitizedName, StringComparison.OrdinalIgnoreCase));

        if (existing is not null)
        {
            return existing;
        }

        var created = new LeadProjectDto(Guid.NewGuid(), customerId, sanitizedName, true);
        _projects[created.Id] = created;
        return created;
    }

    private IReadOnlyCollection<LeadQualificationAnswerDto> NormalizeQualificationAnswers(IReadOnlyCollection<LeadQualificationAnswerRequest> answers)
    {
        var provided = answers
            .GroupBy(item => item.QuestionCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Last().Answer, StringComparer.OrdinalIgnoreCase);

        var knownCodes = _qualificationQuestions.Select(item => item.Code).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var unknownCodes = provided.Keys.Where(code => !knownCodes.Contains(code)).ToArray();
        if (unknownCodes.Length > 0)
        {
            throw new ArgumentException($"Unknown qualification question codes: {string.Join(", ", unknownCodes)}", nameof(answers));
        }

        return _qualificationQuestions
            .OrderBy(item => item.SortOrder)
            .Select(item => new LeadQualificationAnswerDto(
                item.Code,
                provided.TryGetValue(item.Code, out var answer) ? answer : null))
            .ToArray();
    }

    private IReadOnlyCollection<LeadAmountLineDto> NormalizeAmountLines(IReadOnlyCollection<LeadAmountLineRequest> amountLines)
    {
        return amountLines
            .Select(item =>
            {
                if (!_workTypes.TryGetValue(item.WorkTypeId, out var workType))
                {
                    throw new ArgumentException($"Unknown work type: {item.WorkTypeId}", nameof(amountLines));
                }

                if (item.Amount <= 0m)
                {
                    throw new ArgumentException("Amounts must be positive values.", nameof(amountLines));
                }

                return new LeadAmountLineDto(
                    item.Id ?? Guid.NewGuid(),
                    workType.Id,
                    workType.Code,
                    workType.Name,
                    Math.Round(item.Amount, 2, MidpointRounding.AwayFromZero),
                    item.Note?.Trim() ?? string.Empty);
            })
            .ToArray();
    }

    private static string SanitizeComments(string comments)
    {
        var value = comments?.Trim() ?? string.Empty;
        if (value.Length > 4000)
        {
            throw new ArgumentException("Comments cannot exceed 4000 characters.", nameof(comments));
        }

        return value;
    }

    private static string NormalizeProjectName(string value) => (value ?? string.Empty).Trim();

    private static void ValidateWorkTypeRequest(string code, string name, int sortOrder)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            throw new ArgumentException("Work type code is required.", nameof(code));
        }

        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Work type name is required.", nameof(name));
        }

        if (sortOrder < 0)
        {
            throw new ArgumentException("Sort order must be zero or greater.", nameof(sortOrder));
        }
    }

    private void EnsureUniqueWorkTypeCode(string code, Guid? currentId)
    {
        var normalizedCode = code.Trim();
        var duplicate = _workTypes.Values.FirstOrDefault(item =>
            (!currentId.HasValue || item.Id != currentId.Value)
            && string.Equals(item.Code, normalizedCode, StringComparison.OrdinalIgnoreCase));

        if (duplicate is not null)
        {
            throw new ArgumentException($"Work type code '{normalizedCode}' already exists.", nameof(code));
        }
    }
}
