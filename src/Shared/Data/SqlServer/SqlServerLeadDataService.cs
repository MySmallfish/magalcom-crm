using System.Data;
using System.Text.Json;
using Magalcom.Crm.Shared.Contracts.Leads;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Leads;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer.Internal;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerLeadDataService(DataAccessOptions options)
    : SqlServerDataServiceBase(options), ILeadDataService
{
    private readonly IReadOnlyCollection<QualificationQuestionDefinitionDto> _qualificationQuestions = LeadCalculationService.GetDefaultQuestions();
    private readonly IReadOnlyCollection<StageCoefficientDto> _stageCoefficients = LeadCalculationService.GetDefaultStageCoefficients();

    public async Task<LeadModuleMetadataDto> GetMetadataAsync(CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        var referenceData = await LoadReferenceDataAsync(connection, cancellationToken);

        return new LeadModuleMetadataDto(
            referenceData.Customers.Values.OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            referenceData.Projects.Values.OrderBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            referenceData.WorkTypes.Values.OrderBy(item => item.SortOrder).ThenBy(item => item.Name, StringComparer.OrdinalIgnoreCase).ToArray(),
            _qualificationQuestions,
            _stageCoefficients);
    }

    public async Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(LeadQueryScope? scope = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        return await GetLeadsAsync(connection, null, scope ?? LeadQueryScope.All, cancellationToken);
    }

    public async Task<LeadDto?> GetLeadByIdAsync(Guid leadId, LeadQueryScope? scope = null, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        return await GetLeadByIdAsync(connection, leadId, scope ?? LeadQueryScope.All, cancellationToken);
    }

    public async Task<LeadDto> AddLeadAsync(CreateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(actor);

        await using var connection = await OpenConnectionAsync(cancellationToken);
        var referenceData = await LoadReferenceDataAsync(connection, cancellationToken);
        var payload = PrepareLeadUpsert(
            owner: actor,
            customerId: request.CustomerId,
            projectId: request.ProjectId,
            projectName: request.ProjectName,
            comments: request.Comments,
            qualificationAnswers: request.QualificationAnswers,
            stage: request.Stage,
            isPerpetual: request.IsPerpetual,
            dueDate: request.DueDate,
            offerStatus: request.OfferStatus,
            actualAwardedAmount: request.ActualAwardedAmount,
            amountLines: request.AmountLines,
            referenceData: referenceData);

        var leadId = Guid.NewGuid();
        try
        {
            await SaveLeadAsync(
                connection,
                leadId,
                payload,
                allowInsert: true,
                actor,
                auditAction: "Created",
                auditSummary: "Lead created",
                cancellationToken);
        }
        catch (SqlException error) when (IsValidationError(error))
        {
            throw new ArgumentException(error.Message, nameof(request), error);
        }

        return (await GetLeadByIdAsync(connection, leadId, LeadQueryScope.All, cancellationToken))!;
    }

    public async Task<LeadDto?> SaveLeadAsync(Guid leadId, UpdateLeadRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(actor);

        await using var connection = await OpenConnectionAsync(cancellationToken);
        var existing = await GetLeadByIdAsync(connection, leadId, LeadQueryScope.All, cancellationToken);
        if (existing is null)
        {
            return null;
        }

        var referenceData = await LoadReferenceDataAsync(connection, cancellationToken);
        var payload = PrepareLeadUpsert(
            owner: existing.Owner,
            customerId: request.CustomerId,
            projectId: request.ProjectId,
            projectName: request.ProjectName,
            comments: request.Comments,
            qualificationAnswers: request.QualificationAnswers,
            stage: request.Stage,
            isPerpetual: request.IsPerpetual,
            dueDate: request.DueDate,
            offerStatus: request.OfferStatus,
            actualAwardedAmount: request.ActualAwardedAmount,
            amountLines: request.AmountLines,
            referenceData: referenceData);

        try
        {
            var wasSaved = await SaveLeadAsync(
                connection,
                leadId,
                payload,
                allowInsert: false,
                actor,
                auditAction: "Updated",
                auditSummary: "Lead updated",
                cancellationToken);

            if (!wasSaved)
            {
                return null;
            }
        }
        catch (SqlException error) when (IsValidationError(error))
        {
            throw new ArgumentException(error.Message, nameof(request), error);
        }

        return await GetLeadByIdAsync(connection, leadId, LeadQueryScope.All, cancellationToken);
    }

    public async Task<IReadOnlyCollection<WorkTypeDto>> GetWorkTypesAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                [Id],
                [Code],
                [Name],
                [SortOrder],
                [IsActive]
            FROM [crm].[WorkTypeView]
            ORDER BY [SortOrder], [Name], [Id];
            """;

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var workTypes = new List<WorkTypeDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            workTypes.Add(MapWorkType(reader));
        }

        return workTypes;
    }

    public async Task<WorkTypeDto> AddWorkTypeAsync(CreateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(actor);

        ValidateWorkTypeRequest(request.Code, request.Name, request.SortOrder);

        var workTypeId = Guid.NewGuid();

        await using var connection = await OpenConnectionAsync(cancellationToken);
        try
        {
            await SaveWorkTypeAsync(
                connection,
                workTypeId,
                request.Code,
                request.Name,
                request.SortOrder,
                request.IsActive,
                allowInsert: true,
                cancellationToken);
        }
        catch (SqlException error) when (IsValidationError(error))
        {
            throw new ArgumentException(error.Message, nameof(request), error);
        }

        return (await GetWorkTypeByIdAsync(connection, workTypeId, cancellationToken))!;
    }

    public async Task<WorkTypeDto?> SaveWorkTypeAsync(Guid workTypeId, UpdateWorkTypeRequest request, LeadOwnerDto actor, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);
        ArgumentNullException.ThrowIfNull(actor);

        ValidateWorkTypeRequest(request.Code, request.Name, request.SortOrder);

        await using var connection = await OpenConnectionAsync(cancellationToken);
        try
        {
            var wasSaved = await SaveWorkTypeAsync(
                connection,
                workTypeId,
                request.Code,
                request.Name,
                request.SortOrder,
                request.IsActive,
                allowInsert: false,
                cancellationToken);

            if (!wasSaved)
            {
                return null;
            }
        }
        catch (SqlException error) when (IsValidationError(error))
        {
            throw new ArgumentException(error.Message, nameof(request), error);
        }

        return await GetWorkTypeByIdAsync(connection, workTypeId, cancellationToken);
    }

    public async Task<bool> DeleteLeadAsync(Guid leadId, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand("[crm].[DeleteLead]", connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@LeadId", leadId);
        var wasDeletedParameter = command.Parameters.Add("@WasDeleted", SqlDbType.Bit);
        wasDeletedParameter.Direction = ParameterDirection.Output;

        await command.ExecuteNonQueryAsync(cancellationToken);
        return wasDeletedParameter.Value is bool value && value;
    }

    private LeadUpsertPayload PrepareLeadUpsert(
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
        ReferenceDataSnapshot referenceData)
    {
        if (!referenceData.Customers.ContainsKey(customerId))
        {
            throw new ArgumentException("Customer must exist in CRM master data.", nameof(customerId));
        }

        if (actualAwardedAmount is < 0m)
        {
            throw new ArgumentException("Actual awarded amount cannot be negative.", nameof(actualAwardedAmount));
        }

        var resolvedProject = ResolveProject(customerId, projectId, projectName, referenceData.Projects);
        var normalizedAnswers = NormalizeQualificationAnswers(qualificationAnswers);
        var normalizedLines = NormalizeAmountLines(amountLines, referenceData.WorkTypes);

        return new LeadUpsertPayload(
            owner,
            customerId,
            resolvedProject.ProjectId,
            resolvedProject.ProjectName,
            SanitizeComments(comments),
            normalizedAnswers,
            stage,
            isPerpetual,
            dueDate,
            offerStatus,
            actualAwardedAmount.HasValue
                ? Math.Round(actualAwardedAmount.Value, 2, MidpointRounding.AwayFromZero)
                : null,
            normalizedLines);
    }

    private (Guid? ProjectId, string ProjectName) ResolveProject(
        Guid customerId,
        Guid? projectId,
        string projectName,
        IReadOnlyDictionary<Guid, LeadProjectDto> projects)
    {
        if (projectId.HasValue)
        {
            if (!projects.TryGetValue(projectId.Value, out var existingProject) || existingProject.CustomerId != customerId)
            {
                throw new ArgumentException("Project must belong to the selected customer.", nameof(projectId));
            }

            return (existingProject.Id, string.Empty);
        }

        var sanitizedName = NormalizeProjectName(projectName);
        if (string.IsNullOrWhiteSpace(sanitizedName))
        {
            throw new ArgumentException("Project is required.", nameof(projectName));
        }

        var existing = projects.Values.FirstOrDefault(item =>
            item.CustomerId == customerId
            && string.Equals(NormalizeProjectName(item.Name), sanitizedName, StringComparison.OrdinalIgnoreCase));

        return existing is null ? (null, sanitizedName) : (existing.Id, string.Empty);
    }

    private IReadOnlyCollection<LeadQualificationAnswerDto> NormalizeQualificationAnswers(IReadOnlyCollection<LeadQualificationAnswerRequest> answers)
    {
        var provided = (answers ?? Array.Empty<LeadQualificationAnswerRequest>())
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

    private static IReadOnlyCollection<LeadQualificationAnswerDto> NormalizePersistedAnswers(
        IReadOnlyCollection<LeadQualificationAnswerDto> answers,
        IReadOnlyCollection<QualificationQuestionDefinitionDto> definitions)
    {
        var provided = answers
            .GroupBy(item => item.QuestionCode, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(group => group.Key, group => group.Last().Answer, StringComparer.OrdinalIgnoreCase);

        return definitions
            .OrderBy(item => item.SortOrder)
            .Select(item => new LeadQualificationAnswerDto(
                item.Code,
                provided.TryGetValue(item.Code, out var answer) ? answer : null))
            .ToArray();
    }

    private static IReadOnlyCollection<LeadAmountLineDto> NormalizeAmountLines(
        IReadOnlyCollection<LeadAmountLineRequest> amountLines,
        IReadOnlyDictionary<Guid, WorkTypeDto> workTypes)
    {
        return (amountLines ?? Array.Empty<LeadAmountLineRequest>())
            .Select(item =>
            {
                if (!workTypes.TryGetValue(item.WorkTypeId, out var workType))
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

    private async Task<ReferenceDataSnapshot> LoadReferenceDataAsync(SqlConnection connection, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                [Id],
                [Name],
                [ExternalId]
            FROM [crm].[CustomerView];

            SELECT
                [Id],
                [CustomerId],
                [Name],
                [IsActive]
            FROM [crm].[LeadProjectView];

            SELECT
                [Id],
                [Code],
                [Name],
                [SortOrder],
                [IsActive]
            FROM [crm].[WorkTypeView];
            """;

        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var customers = new Dictionary<Guid, LeadCustomerDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var customer = new LeadCustomerDto(
                reader.GetGuid("Id"),
                reader.GetString("Name"),
                reader.GetString("ExternalId"));
            customers[customer.Id] = customer;
        }

        await reader.NextResultAsync(cancellationToken);

        var projects = new Dictionary<Guid, LeadProjectDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var project = new LeadProjectDto(
                reader.GetGuid("Id"),
                reader.GetGuid("CustomerId"),
                reader.GetString("Name"),
                reader.GetBoolean("IsActive"));
            projects[project.Id] = project;
        }

        await reader.NextResultAsync(cancellationToken);

        var workTypes = new Dictionary<Guid, WorkTypeDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var workType = MapWorkType(reader);
            workTypes[workType.Id] = workType;
        }

        return new ReferenceDataSnapshot(customers, projects, workTypes);
    }

    private async Task<IReadOnlyCollection<LeadDto>> GetLeadsAsync(SqlConnection connection, Guid? leadId, LeadQueryScope scope, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                [Id],
                [OwnerSubjectId],
                [OwnerDisplayName],
                [OwnerEmail],
                [CustomerId],
                [CustomerName],
                [CustomerExternalId],
                [ProjectId],
                [ProjectName],
                [ProjectIsActive],
                [Comments],
                [Stage],
                [IsPerpetual],
                [DueDate],
                [OfferStatus],
                [ActualAwardedAmount],
                [CreatedAtUtc],
                [UpdatedAtUtc]
            FROM [crm].[LeadView]
            WHERE (@LeadId IS NULL OR [Id] = @LeadId)
              AND (@CanViewAll = 1 OR [OwnerSubjectId] = @OwnerSubjectId)
            ORDER BY [UpdatedAtUtc] DESC, [CustomerName], [Id];

            SELECT
                [Line].[Id],
                [Line].[LeadId],
                [Line].[WorkTypeId],
                [Line].[WorkTypeCode],
                [Line].[WorkTypeName],
                [Line].[Amount],
                [Line].[Note]
            FROM [crm].[LeadAmountLineView] AS [Line]
            INNER JOIN [crm].[Lead] AS [LeadFilter] ON [LeadFilter].[Id] = [Line].[LeadId]
            WHERE (@LeadId IS NULL OR [Line].[LeadId] = @LeadId)
              AND (@CanViewAll = 1 OR [LeadFilter].[OwnerSubjectId] = @OwnerSubjectId)
            ORDER BY [Line].[LeadId], [Line].[WorkTypeName], [Line].[Id];

            SELECT
                [Answer].[LeadId],
                [Answer].[QuestionCode],
                [Answer].[Answer]
            FROM [crm].[LeadQualificationAnswerView] AS [Answer]
            INNER JOIN [crm].[Lead] AS [LeadFilter] ON [LeadFilter].[Id] = [Answer].[LeadId]
            WHERE (@LeadId IS NULL OR [Answer].[LeadId] = @LeadId)
              AND (@CanViewAll = 1 OR [LeadFilter].[OwnerSubjectId] = @OwnerSubjectId)
            ORDER BY [Answer].[LeadId], [Answer].[QuestionCode];

            SELECT
                [Audit].[LeadId],
                [Audit].[ChangedAtUtc],
                [Audit].[ChangedBy],
                [Audit].[Action],
                [Audit].[Summary]
            FROM [crm].[LeadAuditEventView] AS [Audit]
            INNER JOIN [crm].[Lead] AS [LeadFilter] ON [LeadFilter].[Id] = [Audit].[LeadId]
            WHERE (@LeadId IS NULL OR [Audit].[LeadId] = @LeadId)
              AND (@CanViewAll = 1 OR [LeadFilter].[OwnerSubjectId] = @OwnerSubjectId)
            ORDER BY [Audit].[LeadId], [Audit].[ChangedAtUtc], [Audit].[Id];
            """;

        await using var command = new SqlCommand(sql, connection);
        AddNullableParameter(command, "@LeadId", SqlDbType.UniqueIdentifier, leadId);
        command.Parameters.AddWithValue("@CanViewAll", scope.CanViewAll);
        AddSizedParameter(command, "@OwnerSubjectId", SqlDbType.NVarChar, scope.SubjectId, 200);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var headers = new List<LeadHeaderRow>();
        while (await reader.ReadAsync(cancellationToken))
        {
            headers.Add(MapLeadHeader(reader));
        }

        await reader.NextResultAsync(cancellationToken);

        var amountLinesByLeadId = new Dictionary<Guid, List<LeadAmountLineDto>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var currentLeadId = reader.GetGuid("LeadId");
            if (!amountLinesByLeadId.TryGetValue(currentLeadId, out var lines))
            {
                lines = [];
                amountLinesByLeadId[currentLeadId] = lines;
            }

            lines.Add(new LeadAmountLineDto(
                reader.GetGuid("Id"),
                reader.GetGuid("WorkTypeId"),
                reader.GetString("WorkTypeCode"),
                reader.GetString("WorkTypeName"),
                reader.GetDecimal("Amount"),
                reader.GetString("Note")));
        }

        await reader.NextResultAsync(cancellationToken);

        var answersByLeadId = new Dictionary<Guid, List<LeadQualificationAnswerDto>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var currentLeadId = reader.GetGuid("LeadId");
            if (!answersByLeadId.TryGetValue(currentLeadId, out var answers))
            {
                answers = [];
                answersByLeadId[currentLeadId] = answers;
            }

            answers.Add(new LeadQualificationAnswerDto(
                reader.GetString("QuestionCode"),
                reader.GetNullableBoolean("Answer")));
        }

        await reader.NextResultAsync(cancellationToken);

        var auditByLeadId = new Dictionary<Guid, List<LeadAuditEntryDto>>();
        while (await reader.ReadAsync(cancellationToken))
        {
            var currentLeadId = reader.GetGuid("LeadId");
            if (!auditByLeadId.TryGetValue(currentLeadId, out var auditTrail))
            {
                auditTrail = [];
                auditByLeadId[currentLeadId] = auditTrail;
            }

            auditTrail.Add(new LeadAuditEntryDto(
                reader.GetDateTime("ChangedAtUtc"),
                reader.GetString("ChangedBy"),
                reader.GetString("Action"),
                reader.GetString("Summary")));
        }

        return headers
            .Select(header =>
            {
                var amountLines = amountLinesByLeadId.TryGetValue(header.Id, out var lines)
                    ? (IReadOnlyCollection<LeadAmountLineDto>)lines
                    : Array.Empty<LeadAmountLineDto>();
                var answers = answersByLeadId.TryGetValue(header.Id, out var leadAnswers)
                    ? (IReadOnlyCollection<LeadQualificationAnswerDto>)leadAnswers
                    : Array.Empty<LeadQualificationAnswerDto>();
                var auditTrail = auditByLeadId.TryGetValue(header.Id, out var leadAudit)
                    ? (IReadOnlyCollection<LeadAuditEntryDto>)leadAudit
                    : Array.Empty<LeadAuditEntryDto>();

                return BuildLeadDto(header, amountLines, answers, auditTrail);
            })
            .ToArray();
    }

    private async Task<LeadDto?> GetLeadByIdAsync(SqlConnection connection, Guid leadId, LeadQueryScope scope, CancellationToken cancellationToken)
    {
        return (await GetLeadsAsync(connection, leadId, scope, cancellationToken)).SingleOrDefault();
    }

    private LeadDto BuildLeadDto(
        LeadHeaderRow header,
        IReadOnlyCollection<LeadAmountLineDto> amountLines,
        IReadOnlyCollection<LeadQualificationAnswerDto> answers,
        IReadOnlyCollection<LeadAuditEntryDto> auditTrail)
    {
        var normalizedAnswers = NormalizePersistedAnswers(answers, _qualificationQuestions);
        var normalizedLines = amountLines
            .OrderBy(item => item.WorkTypeName, StringComparer.OrdinalIgnoreCase)
            .ThenBy(item => item.Id)
            .ToArray();
        var normalizedAuditTrail = auditTrail
            .OrderBy(item => item.ChangedAtUtc)
            .ThenBy(item => item.Action, StringComparer.OrdinalIgnoreCase)
            .ToArray();
        var calculation = LeadCalculationService.Compute(
            normalizedAnswers,
            header.Stage,
            header.IsPerpetual,
            header.DueDate,
            header.OfferStatus,
            header.ActualAwardedAmount,
            normalizedLines);

        return new LeadDto(
            header.Id,
            header.Owner,
            header.Customer,
            header.Project,
            header.Comments,
            normalizedAnswers,
            header.Stage,
            header.IsPerpetual,
            header.DueDate,
            header.OfferStatus,
            header.ActualAwardedAmount,
            normalizedLines,
            calculation.Metrics,
            calculation.IsIncomplete,
            calculation.MissingFields,
            calculation.AmountTotalsByWorkType,
            normalizedAuditTrail,
            header.CreatedAtUtc,
            header.UpdatedAtUtc);
    }

    private async Task<bool> SaveLeadAsync(
        SqlConnection connection,
        Guid leadId,
        LeadUpsertPayload payload,
        bool allowInsert,
        LeadOwnerDto actor,
        string auditAction,
        string auditSummary,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand("[crm].[SaveLead]", connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@LeadId", leadId);
        command.Parameters.AddWithValue("@AllowInsert", allowInsert);
        command.Parameters.AddWithValue("@OwnerSubjectId", payload.Owner.SubjectId);
        command.Parameters.AddWithValue("@OwnerDisplayName", payload.Owner.DisplayName);
        command.Parameters.AddWithValue("@OwnerEmail", payload.Owner.Email);
        command.Parameters.AddWithValue("@CustomerId", payload.CustomerId);
        AddNullableParameter(command, "@ProjectId", SqlDbType.UniqueIdentifier, payload.ProjectId);
        AddSizedParameter(command, "@ProjectName", SqlDbType.NVarChar, payload.ProjectName, 200);
        AddSizedParameter(command, "@Comments", SqlDbType.NVarChar, payload.Comments, 4000);
        AddNullableParameter(command, "@Stage", SqlDbType.SmallInt, payload.Stage.HasValue ? (short)payload.Stage.Value : null);
        AddNullableParameter(command, "@IsPerpetual", SqlDbType.Bit, payload.IsPerpetual);
        AddNullableParameter(
            command,
            "@DueDate",
            SqlDbType.Date,
            payload.DueDate.HasValue ? payload.DueDate.Value.ToDateTime(TimeOnly.MinValue) : null);
        command.Parameters.AddWithValue("@OfferStatus", (short)payload.OfferStatus);

        var actualAwardedParameter = AddNullableParameter(command, "@ActualAwardedAmount", SqlDbType.Decimal, payload.ActualAwardedAmount);
        actualAwardedParameter.Precision = 18;
        actualAwardedParameter.Scale = 2;

        var qualificationAnswersJson = JsonSerializer.Serialize(payload.QualificationAnswers.Select(item => new
        {
            item.QuestionCode,
            item.Answer
        }));
        AddSizedParameter(command, "@QualificationAnswersJson", SqlDbType.NVarChar, qualificationAnswersJson, -1);

        var amountLinesJson = JsonSerializer.Serialize(payload.AmountLines.Select(item => new
        {
            item.Id,
            item.WorkTypeId,
            item.Amount,
            item.Note
        }));
        AddSizedParameter(command, "@AmountLinesJson", SqlDbType.NVarChar, amountLinesJson, -1);

        AddSizedParameter(command, "@ChangedBy", SqlDbType.NVarChar, actor.DisplayName, 200);
        AddSizedParameter(command, "@AuditAction", SqlDbType.NVarChar, auditAction, 100);
        AddSizedParameter(command, "@AuditSummary", SqlDbType.NVarChar, auditSummary, 500);

        var wasSavedParameter = command.Parameters.Add("@WasSaved", SqlDbType.Bit);
        wasSavedParameter.Direction = ParameterDirection.Output;

        await command.ExecuteNonQueryAsync(cancellationToken);
        return wasSavedParameter.Value is bool value && value;
    }

    private async Task<bool> SaveWorkTypeAsync(
        SqlConnection connection,
        Guid workTypeId,
        string code,
        string name,
        int sortOrder,
        bool isActive,
        bool allowInsert,
        CancellationToken cancellationToken)
    {
        await using var command = new SqlCommand("[crm].[SaveWorkType]", connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@WorkTypeId", workTypeId);
        AddSizedParameter(command, "@Code", SqlDbType.NVarChar, code.Trim(), 50);
        AddSizedParameter(command, "@Name", SqlDbType.NVarChar, name.Trim(), 100);
        command.Parameters.AddWithValue("@SortOrder", sortOrder);
        command.Parameters.AddWithValue("@IsActive", isActive);
        command.Parameters.AddWithValue("@AllowInsert", allowInsert);

        var wasSavedParameter = command.Parameters.Add("@WasSaved", SqlDbType.Bit);
        wasSavedParameter.Direction = ParameterDirection.Output;

        await command.ExecuteNonQueryAsync(cancellationToken);
        return wasSavedParameter.Value is bool value && value;
    }

    private static async Task<WorkTypeDto?> GetWorkTypeByIdAsync(SqlConnection connection, Guid workTypeId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                [Id],
                [Code],
                [Name],
                [SortOrder],
                [IsActive]
            FROM [crm].[WorkTypeView]
            WHERE [Id] = @WorkTypeId;
            """;

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@WorkTypeId", workTypeId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapWorkType(reader);
    }

    private static WorkTypeDto MapWorkType(SqlDataReader reader) =>
        new(
            reader.GetGuid("Id"),
            reader.GetString("Code"),
            reader.GetString("Name"),
            reader.GetInt32("SortOrder"),
            reader.GetBoolean("IsActive"));

    private static LeadHeaderRow MapLeadHeader(SqlDataReader reader) =>
        new(
            reader.GetGuid("Id"),
            new LeadOwnerDto(
                reader.GetString("OwnerSubjectId"),
                reader.GetString("OwnerDisplayName"),
                reader.GetString("OwnerEmail")),
            new LeadCustomerDto(
                reader.GetGuid("CustomerId"),
                reader.GetString("CustomerName"),
                reader.GetString("CustomerExternalId")),
            new LeadProjectDto(
                reader.GetGuid("ProjectId"),
                reader.GetGuid("CustomerId"),
                reader.GetString("ProjectName"),
                reader.GetBoolean("ProjectIsActive")),
            reader.GetString("Comments"),
            reader.GetNullableInt16("Stage") is short stage ? (LeadStage)stage : null,
            reader.GetNullableBoolean("IsPerpetual"),
            reader.GetNullableDateOnly("DueDate"),
            (LeadOfferStatus)reader.GetInt16("OfferStatus"),
            reader.GetNullableDecimal("ActualAwardedAmount"),
            reader.GetDateTime("CreatedAtUtc"),
            reader.GetDateTime("UpdatedAtUtc"));

    private static SqlParameter AddNullableParameter(SqlCommand command, string name, SqlDbType type, object? value)
    {
        var parameter = command.Parameters.Add(name, type);
        parameter.Value = value ?? DBNull.Value;
        return parameter;
    }

    private static SqlParameter AddSizedParameter(SqlCommand command, string name, SqlDbType type, object? value, int size)
    {
        var parameter = command.Parameters.Add(name, type, size);
        parameter.Value = value ?? DBNull.Value;
        return parameter;
    }

    private static bool IsValidationError(SqlException error) =>
        error.Number is 50000 or 547 or 2601 or 2627;

    private sealed record ReferenceDataSnapshot(
        IReadOnlyDictionary<Guid, LeadCustomerDto> Customers,
        IReadOnlyDictionary<Guid, LeadProjectDto> Projects,
        IReadOnlyDictionary<Guid, WorkTypeDto> WorkTypes);

    private sealed record LeadHeaderRow(
        Guid Id,
        LeadOwnerDto Owner,
        LeadCustomerDto Customer,
        LeadProjectDto Project,
        string Comments,
        LeadStage? Stage,
        bool? IsPerpetual,
        DateOnly? DueDate,
        LeadOfferStatus OfferStatus,
        decimal? ActualAwardedAmount,
        DateTime CreatedAtUtc,
        DateTime UpdatedAtUtc);

    private sealed record LeadUpsertPayload(
        LeadOwnerDto Owner,
        Guid CustomerId,
        Guid? ProjectId,
        string ProjectName,
        string Comments,
        IReadOnlyCollection<LeadQualificationAnswerDto> QualificationAnswers,
        LeadStage? Stage,
        bool? IsPerpetual,
        DateOnly? DueDate,
        LeadOfferStatus OfferStatus,
        decimal? ActualAwardedAmount,
        IReadOnlyCollection<LeadAmountLineDto> AmountLines);
}
