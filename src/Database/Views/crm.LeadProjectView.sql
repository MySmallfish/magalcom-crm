CREATE VIEW [crm].[LeadProjectView]
AS
    SELECT
        [p].[Id],
        [p].[CustomerId],
        [p].[Name],
        [p].[IsActive]
    FROM [crm].[LeadProject] AS [p];

GO
