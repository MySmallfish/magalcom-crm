using Magalcom.Crm.Shared.Data.Options;
using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer.Internal;

public abstract class SqlServerDataServiceBase
{
    private readonly string _connectionString;

    protected SqlServerDataServiceBase(DataAccessOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        if (string.IsNullOrWhiteSpace(options.ConnectionString))
        {
            throw new InvalidOperationException("DataAccess:ConnectionString must be configured when DataAccess:Provider=SqlServer.");
        }

        _connectionString = options.ConnectionString;
    }

    protected async Task<SqlConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = new SqlConnection(_connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }
}
