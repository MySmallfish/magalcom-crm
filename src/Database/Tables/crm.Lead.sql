CREATE TABLE [crm].[Lead]
(
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_Lead_Id] DEFAULT (NEWID()),
    [OwnerSubjectId] NVARCHAR(200) NOT NULL,
    [OwnerDisplayName] NVARCHAR(200) NOT NULL,
    [OwnerEmail] NVARCHAR(256) NOT NULL,
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [ProjectId] UNIQUEIDENTIFIER NOT NULL,
    [Comments] NVARCHAR(4000) NOT NULL CONSTRAINT [DF_Lead_Comments] DEFAULT (N''),
    [Stage] SMALLINT NULL,
    [IsPerpetual] BIT NULL,
    [DueDate] DATE NULL,
    [OfferStatus] SMALLINT NOT NULL,
    [ActualAwardedAmount] DECIMAL(18, 2) NULL,
    [CreatedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_Lead_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_Lead_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_Lead] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Lead_Customer] FOREIGN KEY ([CustomerId]) REFERENCES [crm].[Customer] ([Id]),
    CONSTRAINT [FK_Lead_Project] FOREIGN KEY ([ProjectId]) REFERENCES [crm].[LeadProject] ([Id]),
    CONSTRAINT [CK_Lead_ActualAwardedAmount_NonNegative] CHECK ([ActualAwardedAmount] IS NULL OR [ActualAwardedAmount] >= 0)
);

GO

CREATE NONCLUSTERED INDEX [IX_Lead_CustomerId]
    ON [crm].[Lead] ([CustomerId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_Lead_ProjectId]
    ON [crm].[Lead] ([ProjectId] ASC);

GO

CREATE NONCLUSTERED INDEX [IX_Lead_UpdatedAtUtc]
    ON [crm].[Lead] ([UpdatedAtUtc] DESC);

GO
