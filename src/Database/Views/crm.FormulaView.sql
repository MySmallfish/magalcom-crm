CREATE VIEW [crm].[FormulaView]
AS
    SELECT
        [f].[Id],
        [f].[Name],
        [f].[Expression],
        [f].[IsActive]
    FROM [crm].[Formula] AS [f];

GO
