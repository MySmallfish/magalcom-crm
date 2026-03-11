MERGE [crm].[Project] AS [Target]
USING
(
    VALUES
        (CAST('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AS UNIQUEIDENTIFIER), N'CRM Core', N'Sales', N'CRM', CAST(1 AS BIT))
) AS [Source] ([Id], [Name], [Department], [Domain], [IsActive])
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [Name] = [Source].[Name],
        [Department] = [Source].[Department],
        [Domain] = [Source].[Domain],
        [IsActive] = [Source].[IsActive],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Id], [Name], [Department], [Domain], [IsActive])
    VALUES ([Source].[Id], [Source].[Name], [Source].[Department], [Source].[Domain], [Source].[IsActive]);

MERGE [crm].[Formula] AS [Target]
USING
(
    VALUES
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'Default Forecast', N'PotentialAmount * 0.42', CAST(1 AS BIT))
) AS [Source] ([Id], [Name], [Expression], [IsActive])
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [Name] = [Source].[Name],
        [Expression] = [Source].[Expression],
        [IsActive] = [Source].[IsActive],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Id], [Name], [Expression], [IsActive])
    VALUES ([Source].[Id], [Source].[Name], [Source].[Expression], [Source].[IsActive]);

MERGE [crm].[FormulaFactor] AS [Target]
USING
(
    VALUES
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'KnowCustomerPersonally', N'Know Customer Personally', CAST(15.00 AS DECIMAL(5, 2)), CAST(0 AS BIT), CAST(1 AS BIT), 10),
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'RepeatCustomer', N'Repeat Customer', CAST(15.00 AS DECIMAL(5, 2)), CAST(0 AS BIT), CAST(1 AS BIT), 20),
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'InvolvedInPlanning', N'Involved In Planning', CAST(15.00 AS DECIMAL(5, 2)), CAST(0 AS BIT), CAST(1 AS BIT), 30),
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'RelationshipWithConsultant', N'Relationship With Consultant', CAST(20.00 AS DECIMAL(5, 2)), CAST(0 AS BIT), CAST(1 AS BIT), 40),
        (CAST('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' AS UNIQUEIDENTIFIER), N'RelationshipWithProjectManagement', N'Relationship With Project Management', CAST(25.00 AS DECIMAL(5, 2)), CAST(0 AS BIT), CAST(1 AS BIT), 50)
) AS [Source] ([FormulaId], [Code], [DisplayName], [WeightPercent], [IsRequired], [IsActive], [SortOrder])
ON [Target].[FormulaId] = [Source].[FormulaId]
   AND [Target].[Code] = [Source].[Code]
WHEN MATCHED THEN
    UPDATE SET
        [DisplayName] = [Source].[DisplayName],
        [WeightPercent] = [Source].[WeightPercent],
        [IsRequired] = [Source].[IsRequired],
        [IsActive] = [Source].[IsActive],
        [SortOrder] = [Source].[SortOrder]
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([FormulaId], [Code], [DisplayName], [WeightPercent], [IsRequired], [IsActive], [SortOrder])
    VALUES ([Source].[FormulaId], [Source].[Code], [Source].[DisplayName], [Source].[WeightPercent], [Source].[IsRequired], [Source].[IsActive], [Source].[SortOrder]);

MERGE [crm].[Customer] AS [Target]
USING
(
    VALUES
        (CAST('c1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'Contoso Security', N'CRM-C-1001', CAST(1 AS BIT)),
        (CAST('c2222222-2222-2222-2222-222222222222' AS UNIQUEIDENTIFIER), N'Fabrikam Energy', N'CRM-C-1002', CAST(1 AS BIT)),
        (CAST('c3333333-3333-3333-3333-333333333333' AS UNIQUEIDENTIFIER), N'Northwind Logistics', N'CRM-C-1003', CAST(1 AS BIT))
) AS [Source] ([Id], [Name], [ExternalId], [IsActive])
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [Name] = [Source].[Name],
        [ExternalId] = [Source].[ExternalId],
        [IsActive] = [Source].[IsActive],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Id], [Name], [ExternalId], [IsActive])
    VALUES ([Source].[Id], [Source].[Name], [Source].[ExternalId], [Source].[IsActive]);

MERGE [crm].[WorkType] AS [Target]
USING
(
    VALUES
        (CAST('d1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'DETECT', N'Detection', 10, CAST(1 AS BIT)),
        (CAST('d2222222-2222-2222-2222-222222222222' AS UNIQUEIDENTIFIER), N'ACCESS', N'Access Control', 20, CAST(1 AS BIT)),
        (CAST('d3333333-3333-3333-3333-333333333333' AS UNIQUEIDENTIFIER), N'CAMERA', N'CCTV', 30, CAST(1 AS BIT)),
        (CAST('d4444444-4444-4444-4444-444444444444' AS UNIQUEIDENTIFIER), N'SOFT', N'Software', 40, CAST(1 AS BIT))
) AS [Source] ([Id], [Code], [Name], [SortOrder], [IsActive])
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [Code] = [Source].[Code],
        [Name] = [Source].[Name],
        [SortOrder] = [Source].[SortOrder],
        [IsActive] = [Source].[IsActive],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Id], [Code], [Name], [SortOrder], [IsActive])
    VALUES ([Source].[Id], [Source].[Code], [Source].[Name], [Source].[SortOrder], [Source].[IsActive]);

MERGE [crm].[LeadProject] AS [Target]
USING
(
    VALUES
        (CAST('e1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), CAST('c1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'Airport Phase 1', CAST(1 AS BIT)),
        (CAST('e2222222-2222-2222-2222-222222222222' AS UNIQUEIDENTIFIER), CAST('c2222222-2222-2222-2222-222222222222' AS UNIQUEIDENTIFIER), N'Substation Retrofit', CAST(1 AS BIT)),
        (CAST('e3333333-3333-3333-3333-333333333333' AS UNIQUEIDENTIFIER), CAST('c3333333-3333-3333-3333-333333333333' AS UNIQUEIDENTIFIER), N'Warehouse Upgrade', CAST(1 AS BIT))
) AS [Source] ([Id], [CustomerId], [Name], [IsActive])
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [CustomerId] = [Source].[CustomerId],
        [Name] = [Source].[Name],
        [IsActive] = [Source].[IsActive],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([Id], [CustomerId], [Name], [IsActive])
    VALUES ([Source].[Id], [Source].[CustomerId], [Source].[Name], [Source].[IsActive]);

MERGE [crm].[Lead] AS [Target]
USING
(
    VALUES
        (
            CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
            N'dev-user-001',
            N'Development User',
            N'developer@magalcom.local',
            CAST('c1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
            CAST('e1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
            N'Initial seeded opportunity from CRM shell scaffold.',
            CAST(1 AS SMALLINT),
            CAST(0 AS BIT),
            CAST(DATEADD(DAY, 30, CAST(SYSUTCDATETIME() AS DATE)) AS DATE),
            CAST(0 AS SMALLINT),
            CAST(NULL AS DECIMAL(18, 2))
        )
) AS [Source] (
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
ON [Target].[Id] = [Source].[Id]
WHEN MATCHED THEN
    UPDATE SET
        [OwnerSubjectId] = [Source].[OwnerSubjectId],
        [OwnerDisplayName] = [Source].[OwnerDisplayName],
        [OwnerEmail] = [Source].[OwnerEmail],
        [CustomerId] = [Source].[CustomerId],
        [ProjectId] = [Source].[ProjectId],
        [Comments] = [Source].[Comments],
        [Stage] = [Source].[Stage],
        [IsPerpetual] = [Source].[IsPerpetual],
        [DueDate] = [Source].[DueDate],
        [OfferStatus] = [Source].[OfferStatus],
        [ActualAwardedAmount] = [Source].[ActualAwardedAmount],
        [UpdatedAtUtc] = SYSUTCDATETIME()
WHEN NOT MATCHED BY TARGET THEN
    INSERT
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
        [Source].[Id],
        [Source].[OwnerSubjectId],
        [Source].[OwnerDisplayName],
        [Source].[OwnerEmail],
        [Source].[CustomerId],
        [Source].[ProjectId],
        [Source].[Comments],
        [Source].[Stage],
        [Source].[IsPerpetual],
        [Source].[DueDate],
        [Source].[OfferStatus],
        [Source].[ActualAwardedAmount]
    );

DELETE FROM [crm].[LeadAmountLine]
WHERE [LeadId] = CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER);

INSERT INTO [crm].[LeadAmountLine] ([Id], [LeadId], [WorkTypeId], [Amount], [Note])
VALUES
    (
        CAST('f1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
        CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
        CAST('d1111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
        CAST(45000.00 AS DECIMAL(18, 2)),
        N'Fire panel and detectors'
    ),
    (
        CAST('f2222222-2222-2222-2222-222222222222' AS UNIQUEIDENTIFIER),
        CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
        CAST('d4444444-4444-4444-4444-444444444444' AS UNIQUEIDENTIFIER),
        CAST(12000.00 AS DECIMAL(18, 2)),
        N'Software integration'
    );

DELETE FROM [crm].[LeadQualificationAnswer]
WHERE [LeadId] = CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER);

INSERT INTO [crm].[LeadQualificationAnswer] ([LeadId], [QuestionCode], [Answer])
VALUES
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'knows-customer-personally', CAST(1 AS BIT)),
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'returning-customer', CAST(1 AS BIT)),
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'involved-in-planning', CAST(1 AS BIT)),
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'consultant-relationship', CAST(0 AS BIT)),
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'project-management-relationship', CAST(1 AS BIT)),
    (CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER), N'customer-under-price-list', CAST(0 AS BIT));

DELETE FROM [crm].[LeadAuditEvent]
WHERE [LeadId] = CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER);

INSERT INTO [crm].[LeadAuditEvent] ([LeadId], [ChangedAtUtc], [ChangedBy], [Action], [Summary])
VALUES
    (
        CAST('11111111-1111-1111-1111-111111111111' AS UNIQUEIDENTIFIER),
        DATEADD(DAY, -1, SYSUTCDATETIME()),
        N'Development User',
        N'Seeded',
        N'Lead seeded for development'
    );
