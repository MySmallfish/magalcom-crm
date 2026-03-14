CREATE PROCEDURE [crm].[SaveLead]
    @LeadId UNIQUEIDENTIFIER,
    @AllowInsert BIT,
    @OwnerSubjectId NVARCHAR(200),
    @OwnerDisplayName NVARCHAR(200),
    @OwnerEmail NVARCHAR(256),
    @CustomerId UNIQUEIDENTIFIER,
    @ProjectId UNIQUEIDENTIFIER = NULL,
    @ProjectName NVARCHAR(200) = NULL,
    @Comments NVARCHAR(4000),
    @Stage SMALLINT = NULL,
    @IsPerpetual BIT = NULL,
    @DueDate DATE = NULL,
    @OfferStatus SMALLINT,
    @ActualAwardedAmount DECIMAL(18, 2) = NULL,
    @QualificationAnswersJson NVARCHAR(MAX),
    @AmountLinesJson NVARCHAR(MAX),
    @ChangedBy NVARCHAR(200),
    @AuditAction NVARCHAR(100),
    @AuditSummary NVARCHAR(500),
    @WasSaved BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Comments = LTRIM(RTRIM(ISNULL(@Comments, N'')));
    SET @ProjectName = LTRIM(RTRIM(ISNULL(@ProjectName, N'')));
    SET @ChangedBy = LTRIM(RTRIM(ISNULL(@ChangedBy, N'')));
    SET @AuditAction = LTRIM(RTRIM(ISNULL(@AuditAction, N'')));
    SET @AuditSummary = LTRIM(RTRIM(ISNULL(@AuditSummary, N'')));

    IF NOT EXISTS (SELECT 1 FROM [crm].[Customer] WHERE [Id] = @CustomerId)
    BEGIN
        THROW 50000, N'Customer must exist in CRM master data.', 1;
    END;

    IF LEN(@Comments) > 4000
    BEGIN
        THROW 50000, N'Comments cannot exceed 4000 characters.', 1;
    END;

    IF @ActualAwardedAmount IS NOT NULL AND @ActualAwardedAmount < 0
    BEGIN
        THROW 50000, N'Actual awarded amount cannot be negative.', 1;
    END;

    DECLARE @LeadExists BIT = CASE WHEN EXISTS (SELECT 1 FROM [crm].[Lead] WHERE [Id] = @LeadId) THEN 1 ELSE 0 END;
    IF @LeadExists = 0 AND @AllowInsert = 0
    BEGIN
        SET @WasSaved = 0;
        RETURN;
    END;

    DECLARE @EffectiveProjectId UNIQUEIDENTIFIER = @ProjectId;

    IF @EffectiveProjectId IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM [crm].[LeadProject]
            WHERE [Id] = @EffectiveProjectId
              AND [CustomerId] = @CustomerId
        )
        BEGIN
            THROW 50000, N'Project must belong to the selected customer.', 1;
        END;
    END;
    ELSE
    BEGIN
        IF @ProjectName = N''
        BEGIN
            THROW 50000, N'Project is required.', 1;
        END;

        SELECT TOP (1)
            @EffectiveProjectId = [Id]
        FROM [crm].[LeadProject]
        WHERE [CustomerId] = @CustomerId
          AND [Name] = @ProjectName;

        IF @EffectiveProjectId IS NULL
        BEGIN
            DECLARE @CreatedProject TABLE ([Id] UNIQUEIDENTIFIER NOT NULL);

            INSERT INTO [crm].[LeadProject] ([CustomerId], [Name], [IsActive])
            OUTPUT INSERTED.[Id] INTO @CreatedProject ([Id])
            VALUES (@CustomerId, @ProjectName, 1);

            SELECT TOP (1) @EffectiveProjectId = [Id] FROM @CreatedProject;
        END;
    END;

    DECLARE @QualificationAnswers TABLE
    (
        [QuestionCode] NVARCHAR(100) NOT NULL PRIMARY KEY,
        [Answer] BIT NULL
    );

    INSERT INTO @QualificationAnswers ([QuestionCode], [Answer])
    SELECT
        [JsonData].[QuestionCode],
        [JsonData].[Answer]
    FROM OPENJSON(@QualificationAnswersJson)
    WITH
    (
        [QuestionCode] NVARCHAR(100) '$.QuestionCode',
        [Answer] BIT '$.Answer'
    ) AS [JsonData];

    DECLARE @AmountLines TABLE
    (
        [Id] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        [WorkTypeId] UNIQUEIDENTIFIER NOT NULL,
        [Amount] DECIMAL(18, 2) NOT NULL,
        [Note] NVARCHAR(1000) NOT NULL
    );

    INSERT INTO @AmountLines ([Id], [WorkTypeId], [Amount], [Note])
    SELECT
        [JsonData].[Id],
        [JsonData].[WorkTypeId],
        [JsonData].[Amount],
        ISNULL([JsonData].[Note], N'')
    FROM OPENJSON(@AmountLinesJson)
    WITH
    (
        [Id] UNIQUEIDENTIFIER '$.Id',
        [WorkTypeId] UNIQUEIDENTIFIER '$.WorkTypeId',
        [Amount] DECIMAL(18, 2) '$.Amount',
        [Note] NVARCHAR(1000) '$.Note'
    ) AS [JsonData];

    IF EXISTS (SELECT 1 FROM @AmountLines WHERE [Amount] <= 0)
    BEGIN
        THROW 50000, N'Amounts must be positive values.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM @AmountLines AS [l]
        LEFT JOIN [crm].[WorkType] AS [w] ON [w].[Id] = [l].[WorkTypeId]
        WHERE [w].[Id] IS NULL
    )
    BEGIN
        THROW 50000, N'Unknown work type found in amount lines.', 1;
    END;

    IF @LeadExists = 1
    BEGIN
        UPDATE [crm].[Lead]
        SET
            [CustomerId] = @CustomerId,
            [ProjectId] = @EffectiveProjectId,
            [Comments] = @Comments,
            [Stage] = @Stage,
            [IsPerpetual] = @IsPerpetual,
            [DueDate] = @DueDate,
            [OfferStatus] = @OfferStatus,
            [ActualAwardedAmount] = @ActualAwardedAmount,
            [UpdatedAtUtc] = SYSUTCDATETIME()
        WHERE [Id] = @LeadId;
    END;
    ELSE
    BEGIN
        INSERT INTO [crm].[Lead]
        (
            [Id],
            [OwnerSubjectId],
            [OwnerDisplayName],
            [OwnerEmail],
            [CustomerId],
            [ProjectId],
            [Comments],
            [Stage],
            [IsPerpetual],
            [DueDate],
            [OfferStatus],
            [ActualAwardedAmount]
        )
        VALUES
        (
            @LeadId,
            @OwnerSubjectId,
            @OwnerDisplayName,
            @OwnerEmail,
            @CustomerId,
            @EffectiveProjectId,
            @Comments,
            @Stage,
            @IsPerpetual,
            @DueDate,
            @OfferStatus,
            @ActualAwardedAmount
        );
    END;

    DELETE FROM [crm].[LeadQualificationAnswer]
    WHERE [LeadId] = @LeadId;

    INSERT INTO [crm].[LeadQualificationAnswer] ([LeadId], [QuestionCode], [Answer])
    SELECT
        @LeadId,
        [QuestionCode],
        [Answer]
    FROM @QualificationAnswers;

    DELETE FROM [crm].[LeadAmountLine]
    WHERE [LeadId] = @LeadId;

    INSERT INTO [crm].[LeadAmountLine] ([Id], [LeadId], [WorkTypeId], [Amount], [Note])
    SELECT
        [Id],
        @LeadId,
        [WorkTypeId],
        [Amount],
        [Note]
    FROM @AmountLines;

    INSERT INTO [crm].[LeadAuditEvent] ([LeadId], [ChangedBy], [Action], [Summary])
    VALUES (@LeadId, @ChangedBy, @AuditAction, @AuditSummary);

    SET @WasSaved = 1;
END;

GO
