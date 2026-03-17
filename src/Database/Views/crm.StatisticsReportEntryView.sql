CREATE VIEW [crm].[StatisticsReportEntryView]
AS
    SELECT
        [Id],
        [SalesPersonSubjectId],
        [SalesPersonDisplayName],
        [SalesPersonEmail],
        [EntryDate],
        [ProjectedAmount],
        [ActualAmount]
    FROM [crm].[StatisticsReportEntry];

GO
