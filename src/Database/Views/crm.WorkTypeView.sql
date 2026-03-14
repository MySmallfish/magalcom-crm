CREATE VIEW [crm].[WorkTypeView]
AS
    SELECT
        [w].[Id],
        [w].[Code],
        [w].[Name],
        [w].[SortOrder],
        [w].[IsActive]
    FROM [crm].[WorkType] AS [w];

GO
