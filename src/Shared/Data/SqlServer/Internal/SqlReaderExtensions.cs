using Microsoft.Data.SqlClient;

namespace Magalcom.Crm.Shared.Data.SqlServer.Internal;

internal static class SqlReaderExtensions
{
    public static Guid GetGuid(this SqlDataReader reader, string columnName) =>
        reader.GetGuid(reader.GetOrdinal(columnName));

    public static string GetString(this SqlDataReader reader, string columnName) =>
        reader.GetString(reader.GetOrdinal(columnName));

    public static decimal GetDecimal(this SqlDataReader reader, string columnName) =>
        reader.GetDecimal(reader.GetOrdinal(columnName));

    public static int GetInt32(this SqlDataReader reader, string columnName) =>
        reader.GetInt32(reader.GetOrdinal(columnName));

    public static bool GetBoolean(this SqlDataReader reader, string columnName) =>
        reader.GetBoolean(reader.GetOrdinal(columnName));

    public static DateTime GetDateTime(this SqlDataReader reader, string columnName) =>
        reader.GetDateTime(reader.GetOrdinal(columnName));

    public static short GetInt16(this SqlDataReader reader, string columnName) =>
        reader.GetInt16(reader.GetOrdinal(columnName));

    public static string? GetNullableString(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    public static Guid? GetNullableGuid(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    public static int? GetNullableInt32(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt32(ordinal);
    }

    public static short? GetNullableInt16(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetInt16(ordinal);
    }

    public static bool? GetNullableBoolean(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetBoolean(ordinal);
    }

    public static decimal? GetNullableDecimal(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        return reader.IsDBNull(ordinal) ? null : reader.GetDecimal(ordinal);
    }

    public static DateOnly? GetNullableDateOnly(this SqlDataReader reader, string columnName)
    {
        var ordinal = reader.GetOrdinal(columnName);
        if (reader.IsDBNull(ordinal))
        {
            return null;
        }

        return DateOnly.FromDateTime(reader.GetDateTime(ordinal));
    }
}
