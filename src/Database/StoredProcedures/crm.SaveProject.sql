CREATE PROCEDURE [crm].[SaveProject]
    @ProjectId UNIQUEIDENTIFIER,
    @Name NVARCHAR(200),
    @Department NVARCHAR(100),
    @Domain NVARCHAR(100),
    @IsActive BIT,
    @WasUpdated BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [crm].[Project]
    SET
        [Name] = @Name,
        [Department] = @Department,
        [Domain] = @Domain,
        [IsActive] = @IsActive,
        [UpdatedAtUtc] = SYSUTCDATETIME()
    WHERE [Id] = @ProjectId;

    SET @WasUpdated = CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END;
END;

GO
