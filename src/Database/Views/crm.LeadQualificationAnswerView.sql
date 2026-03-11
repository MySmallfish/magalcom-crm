CREATE VIEW [crm].[LeadQualificationAnswerView]
AS
    SELECT
        [a].[LeadId],
        [a].[QuestionCode],
        [a].[Answer]
    FROM [crm].[LeadQualificationAnswer] AS [a];

GO
