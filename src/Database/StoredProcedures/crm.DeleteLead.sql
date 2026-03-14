CREATE PROCEDURE [crm].[DeleteLead]
    @LeadId UNIQUEIDENTIFIER,
    @WasDeleted BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM [crm].[Lead]
    WHERE [Id] = @LeadId;

    SET @WasDeleted = CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END;
END;

GO
