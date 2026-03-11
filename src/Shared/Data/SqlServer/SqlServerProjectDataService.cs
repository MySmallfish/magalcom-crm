using System.Data;
using Magalcom.Crm.Shared.Contracts.Admin;
using Magalcom.Crm.Shared.Data.Interfaces;
using Magalcom.Crm.Shared.Data.Options;
using Magalcom.Crm.Shared.Data.SqlServer.Internal;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer;

public sealed class SqlServerProjectDataService(DataAccessOptions options) : SqlServerDataServiceBase(options), IProjectDataService
{
    public async Task<IReadOnlyCollection<ProjectDto>> GetProjectsAsync(CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                [Id],
                [Name],
                [Department],
                [Domain],
                [IsActive]
            FROM [crm].[ProjectView]
            ORDER BY [Name], [Id];
            """;

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand(sql, connection);
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);

        var projects = new List<ProjectDto>();
        while (await reader.ReadAsync(cancellationToken))
        {
            projects.Add(MapProject(reader));
        }

        return projects;
    }

    public async Task<ProjectDto?> SaveProjectAsync(Guid projectId, UpdateProjectRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        await using var connection = await OpenConnectionAsync(cancellationToken);
        await using var command = new SqlCommand("[crm].[SaveProject]", connection)
        {
            CommandType = CommandType.StoredProcedure
        };

        command.Parameters.AddWithValue("@ProjectId", projectId);
        command.Parameters.AddWithValue("@Name", request.Name);
        command.Parameters.AddWithValue("@Department", request.Department);
        command.Parameters.AddWithValue("@Domain", request.Domain);
        command.Parameters.AddWithValue("@IsActive", request.IsActive);

        var wasUpdatedParameter = command.Parameters.Add("@WasUpdated", SqlDbType.Bit);
        wasUpdatedParameter.Direction = ParameterDirection.Output;

        await command.ExecuteNonQueryAsync(cancellationToken);

        var wasUpdated = wasUpdatedParameter.Value is bool value && value;
        if (!wasUpdated)
        {
            return null;
        }

        return await GetProjectByIdAsync(connection, projectId, cancellationToken);
    }

    private static ProjectDto MapProject(SqlDataReader reader) =>
        new(
            reader.GetGuid("Id"),
            reader.GetString("Name"),
            reader.GetString("Department"),
            reader.GetString("Domain"),
            reader.GetBoolean("IsActive"));

    private static async Task<ProjectDto?> GetProjectByIdAsync(SqlConnection connection, Guid projectId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                [Id],
                [Name],
                [Department],
                [Domain],
                [IsActive]
            FROM [crm].[ProjectView]
            WHERE [Id] = @ProjectId;
            """;

        await using var command = new SqlCommand(sql, connection);
        command.Parameters.AddWithValue("@ProjectId", projectId);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return MapProject(reader);
    }
}
