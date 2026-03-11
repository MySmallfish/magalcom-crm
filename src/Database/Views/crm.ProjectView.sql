CREATE VIEW [crm].[ProjectView]
AS
    SELECT
        [p].[Id],
        [p].[Name],
        [p].[Department],
        [p].[Domain],
        [p].[IsActive]
    FROM [crm].[Project] AS [p];

GO
