CREATE VIEW [crm].[LeadAmountLineView]
AS
    SELECT
        [l].[Id],
        [l].[LeadId],
        [l].[WorkTypeId],
        [w].[Code] AS [WorkTypeCode],
        [w].[Name] AS [WorkTypeName],
        [l].[Amount],
        [l].[Note]
    FROM [crm].[LeadAmountLine] AS [l]
    INNER JOIN [crm].[WorkType] AS [w] ON [w].[Id] = [l].[WorkTypeId];

GO
