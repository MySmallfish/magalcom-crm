CREATE PROCEDURE [crm].[SaveFormula]
    @FormulaId UNIQUEIDENTIFIER,
    @Name NVARCHAR(200),
    @Expression NVARCHAR(500),
    @IsActive BIT,
    @WasUpdated BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE [crm].[Formula]
    SET
        [Name] = @Name,
        [Expression] = @Expression,
        [IsActive] = @IsActive,
        [UpdatedAtUtc] = SYSUTCDATETIME()
    WHERE [Id] = @FormulaId;

    SET @WasUpdated = CASE WHEN @@ROWCOUNT > 0 THEN 1 ELSE 0 END;
END;

GO
