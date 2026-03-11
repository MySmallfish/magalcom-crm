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
