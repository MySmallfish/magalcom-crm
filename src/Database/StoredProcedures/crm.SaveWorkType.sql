CREATE PROCEDURE [crm].[SaveWorkType]
    @WorkTypeId UNIQUEIDENTIFIER,
    @Code NVARCHAR(50),
    @Name NVARCHAR(100),
    @SortOrder INT,
    @IsActive BIT,
    @AllowInsert BIT,
    @WasSaved BIT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @Code = LTRIM(RTRIM(ISNULL(@Code, N'')));
    SET @Name = LTRIM(RTRIM(ISNULL(@Name, N'')));

    IF @Code = N''
    BEGIN
        THROW 50000, N'Work type code is required.', 1;
    END;

    IF @Name = N''
    BEGIN
        THROW 50000, N'Work type name is required.', 1;
    END;

    IF @SortOrder < 0
    BEGIN
        THROW 50000, N'Sort order must be zero or greater.', 1;
    END;

    IF EXISTS (
        SELECT 1
        FROM [crm].[WorkType]
        WHERE [Code] = @Code
          AND [Id] <> @WorkTypeId
    )
    BEGIN
        DECLARE @duplicateMessage NVARCHAR(4000) = N'Work type code ''' + @Code + N''' already exists.';
        THROW 50000, @duplicateMessage, 1;
    END;

    IF EXISTS (SELECT 1 FROM [crm].[WorkType] WHERE [Id] = @WorkTypeId)
    BEGIN
        UPDATE [crm].[WorkType]
        SET
            [Code] = @Code,
            [Name] = @Name,
            [SortOrder] = @SortOrder,
            [IsActive] = @IsActive,
            [UpdatedAtUtc] = SYSUTCDATETIME()
        WHERE [Id] = @WorkTypeId;

        SET @WasSaved = 1;
        RETURN;
    END;

    IF @AllowInsert = 0
    BEGIN
        SET @WasSaved = 0;
        RETURN;
    END;

    INSERT INTO [crm].[WorkType] ([Id], [Code], [Name], [SortOrder], [IsActive])
    VALUES (@WorkTypeId, @Code, @Name, @SortOrder, @IsActive);

    SET @WasSaved = 1;
END;

GO
