CREATE TABLE [crm].[LeadProject]
(
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_LeadProject_Id] DEFAULT (NEWID()),
    [CustomerId] UNIQUEIDENTIFIER NOT NULL,
    [Name] NVARCHAR(200) NOT NULL,
    [IsActive] BIT NOT NULL CONSTRAINT [DF_LeadProject_IsActive] DEFAULT ((1)),
    [CreatedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_LeadProject_CreatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [UpdatedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_LeadProject_UpdatedAtUtc] DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_LeadProject] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_LeadProject_Customer] FOREIGN KEY ([CustomerId]) REFERENCES [crm].[Customer] ([Id]),
    CONSTRAINT [UQ_LeadProject_Customer_Name] UNIQUE NONCLUSTERED ([CustomerId] ASC, [Name] ASC)
);

GO

CREATE NONCLUSTERED INDEX [IX_LeadProject_CustomerId]
    ON [crm].[LeadProject] ([CustomerId] ASC);

GO
