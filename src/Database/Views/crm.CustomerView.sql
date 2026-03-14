CREATE VIEW [crm].[CustomerView]
AS
    SELECT
        [c].[Id],
        [c].[Name],
        [c].[ExternalId],
        [c].[IsActive]
    FROM [crm].[Customer] AS [c];

GO
