using System.Text.Json;
using System.Text.Json.Serialization;

namespace PlayDesk.API;

/// <summary>
/// All DateTime values in public API DTOs are UTC. SQL Server datetime2 values have an
/// Unspecified Kind when read by EF; always emit a Z suffix to avoid browser-local parsing.
/// </summary>
public sealed class UtcJsonDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
    {
        var utc = value.Kind == DateTimeKind.Local ? value.ToUniversalTime()
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        writer.WriteStringValue(utc);
    }
}
