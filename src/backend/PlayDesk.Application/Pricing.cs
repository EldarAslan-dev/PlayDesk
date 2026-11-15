namespace PlayDesk.Application;

public static class Pricing
{
    public static decimal Calculate(decimal hourlyRate, int durationMinutes)
    {
        if (hourlyRate <= 0) throw AppException.Validation("invalid_rate", "Saatlıq tarif müsbət olmalıdır.");
        if (durationMinutes < 30 || durationMinutes % 30 != 0 || durationMinutes > 1440)
            throw AppException.Validation("invalid_duration", "Müddət 30–1440 dəqiqə arasında, 30-un qatları ilə olmalıdır.");
        return decimal.Round(hourlyRate * durationMinutes / 60m, 2, MidpointRounding.AwayFromZero);
    }
}

public static class BakuTime
{
    private static readonly TimeZoneInfo Zone = GetZone();
    private static TimeZoneInfo GetZone()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Baku"); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.FindSystemTimeZoneById("Azerbaijan Standard Time"); }
    }
    public static DateOnly LocalDate(DateTime utc)
        => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone));
    public static (DateTime StartUtc, DateTime EndUtc) UtcRange(DateOnly localDate)
    {
        var localStart = localDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        return (TimeZoneInfo.ConvertTimeToUtc(localStart, Zone),
            TimeZoneInfo.ConvertTimeToUtc(localStart.AddDays(1), Zone));
    }
}
