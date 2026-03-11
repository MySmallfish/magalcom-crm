CREATE TABLE [crm].[FormulaFactor]
(
    [FormulaFactorId] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_FormulaFactor_Id] DEFAULT (NEWSEQUENTIALID()),
    [FormulaId] UNIQUEIDENTIFIER NOT NULL,
    [Code] NVARCHAR(100) NOT NULL,
    [DisplayName] NVARCHAR(200) NOT NULL,
    [WeightPercent] DECIMAL(5, 2) NOT NULL CONSTRAINT [DF_FormulaFactor_WeightPercent] DEFAULT ((0)),
    [IsRequired] BIT NOT NULL CONSTRAINT [DF_FormulaFactor_IsRequired] DEFAULT ((0)),
    [IsActive] BIT NOT NULL CONSTRAINT [DF_FormulaFactor_IsActive] DEFAULT ((1)),
    [SortOrder] INT NOT NULL CONSTRAINT [DF_FormulaFactor_SortOrder] DEFAULT ((0)),
    CONSTRAINT [PK_FormulaFactor] PRIMARY KEY CLUSTERED ([FormulaFactorId] ASC),
    CONSTRAINT [FK_FormulaFactor_Formula] FOREIGN KEY ([FormulaId]) REFERENCES [crm].[Formula] ([Id]),
    CONSTRAINT [UQ_FormulaFactor_Formula_Code] UNIQUE NONCLUSTERED ([FormulaId] ASC, [Code] ASC),
    CONSTRAINT [CK_FormulaFactor_WeightPercent] CHECK ([WeightPercent] BETWEEN 0 AND 100)
);

GO
