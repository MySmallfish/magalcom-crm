CREATE TABLE [crm].[LeadAuditEvent]
(
    [Id] UNIQUEIDENTIFIER NOT NULL CONSTRAINT [DF_LeadAuditEvent_Id] DEFAULT (NEWID()),
    [LeadId] UNIQUEIDENTIFIER NOT NULL,
    [ChangedAtUtc] DATETIME2(0) NOT NULL CONSTRAINT [DF_LeadAuditEvent_ChangedAtUtc] DEFAULT (SYSUTCDATETIME()),
    [ChangedBy] NVARCHAR(200) NOT NULL,
    [Action] NVARCHAR(100) NOT NULL,
    [Summary] NVARCHAR(500) NOT NULL,
    CONSTRAINT [PK_LeadAuditEvent] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_LeadAuditEvent_Lead] FOREIGN KEY ([LeadId]) REFERENCES [crm].[Lead] ([Id]) ON DELETE CASCADE
);

GO

CREATE NONCLUSTERED INDEX [IX_LeadAuditEvent_LeadId_ChangedAtUtc]
    ON [crm].[LeadAuditEvent] ([LeadId] ASC, [ChangedAtUtc] ASC);

GO
