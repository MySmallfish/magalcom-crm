CREATE TABLE [crm].[LeadAmountLine]
(
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_LeadAmountLine_Id] DEFAULT (NEWID()),
    [LeadId] UNIQUEIDENTIFIER NOT NULL,
    [WorkTypeId] UNIQUEIDENTIFIER NOT NULL,
    [Amount] DECIMAL(18, 2) NOT NULL,
    [Note] NVARCHAR(1000) NOT NULL CONSTRAINT [DF_LeadAmountLine_Note] DEFAULT (N''),
    CONSTRAINT [PK_LeadAmountLine] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_LeadAmountLine_Lead] FOREIGN KEY ([LeadId]) REFERENCES [crm].[Lead] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_LeadAmountLine_WorkType] FOREIGN KEY ([WorkTypeId]) REFERENCES [crm].[WorkType] ([Id]),
    CONSTRAINT [CK_LeadAmountLine_Amount_Positive] CHECK ([Amount] > 0)
);

GO

CREATE NONCLUSTERED INDEX [IX_LeadAmountLine_LeadId]
    ON [crm].[LeadAmountLine] ([LeadId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_LeadAmountLine_WorkTypeId]
    ON [crm].[LeadAmountLine] ([WorkTypeId] ASC);

GO
