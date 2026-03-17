CREATE TABLE [crm].[StatisticsReportEntry]
(
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_StatisticsReportEntry_Id] DEFAULT (NEWID()),
    [SalesPersonSubjectId] NVARCHAR(200) NOT NULL,
    [SalesPersonDisplayName] NVARCHAR(200) NOT NULL,
    [SalesPersonEmail] NVARCHAR(256) NOT NULL,
    [EntryDate] DATE NOT NULL,
    [ProjectedAmount] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_StatisticsReportEntry_ProjectedAmount] DEFAULT ((0)),
    [ActualAmount] DECIMAL(18, 2) NOT NULL CONSTRAINT [DF_StatisticsReportEntry_ActualAmount] DEFAULT ((0)),
    CONSTRAINT [PK_StatisticsReportEntry] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [CK_StatisticsReportEntry_ProjectedAmount_NonNegative] CHECK ([ProjectedAmount] >= 0),
    CONSTRAINT [CK_StatisticsReportEntry_ActualAmount_NonNegative] CHECK ([ActualAmount] >= 0)
);

GO

CREATE NONCLUSTERED INDEX [IX_StatisticsReportEntry_EntryDate]
    ON [crm].[StatisticsReportEntry] ([EntryDate] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_StatisticsReportEntry_SalesPersonSubjectId]
    ON [crm].[StatisticsReportEntry] ([SalesPersonSubjectId] ASC, [EntryDate] ASC);

GO
