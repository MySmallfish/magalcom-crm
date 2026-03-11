CREATE VIEW [crm].[LeadAuditEventView]
AS
    SELECT
        [a].[Id],
        [a].[LeadId],
        [a].[ChangedAtUtc],
        [a].[ChangedBy],
        [a].[Action],
        [a].[Summary]
    FROM [crm].[LeadAuditEvent] AS [a];

GO
