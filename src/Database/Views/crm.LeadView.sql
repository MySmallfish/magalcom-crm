CREATE VIEW [crm].[LeadView]
AS
    SELECT
        [l].[Id],
        [l].[OwnerSubjectId],
        [l].[OwnerDisplayName],
        [l].[OwnerEmail],
        [l].[CustomerId],
        [c].[Name] AS [CustomerName],
        [c].[ExternalId] AS [CustomerExternalId],
        [l].[ProjectId],
        [p].[Name] AS [ProjectName],
        [p].[IsActive] AS [ProjectIsActive],
        [l].[Comments],
        [l].[Stage],
        [l].[IsPerpetual],
        [l].[DueDate],
        [l].[OfferStatus],
        [l].[ActualAwardedAmount],
        [l].[CreatedAtUtc],
        [l].[UpdatedAtUtc]
    FROM [crm].[Lead] AS [l]
    INNER JOIN [crm].[Customer] AS [c] ON [c].[Id] = [l].[CustomerId]
    INNER JOIN [crm].[LeadProject] AS [p] ON [p].[Id] = [l].[ProjectId];

GO
