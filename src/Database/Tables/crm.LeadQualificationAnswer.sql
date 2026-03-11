CREATE TABLE [crm].[LeadQualificationAnswer]
(
    [LeadId] UNIQUEIDENTIFIER NOT NULL,
    [QuestionCode] NVARCHAR(100) NOT NULL,
    [Answer] BIT NULL,
    CONSTRAINT [PK_LeadQualificationAnswer] PRIMARY KEY CLUSTERED ([LeadId] ASC, [QuestionCode] ASC),
    CONSTRAINT [FK_LeadQualificationAnswer_Lead] FOREIGN KEY ([LeadId]) REFERENCES [crm].[Lead] ([Id]) ON DELETE CASCADE
);

GO
