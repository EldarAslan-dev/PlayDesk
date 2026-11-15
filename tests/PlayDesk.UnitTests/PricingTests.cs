using PlayDesk.Application;
using Xunit;

namespace PlayDesk.UnitTests;

public sealed class PricingTests
{
    [Fact]
    public void NinetyMinutesAtTwelveAznsCostsEighteen() =>
        Assert.Equal(18m, Pricing.Calculate(12m, 90));
    [Theory]
    [InlineData(0)]
    [InlineData(15)]
    [InlineData(45)]
    [InlineData(-30)]
    [InlineData(1470)]
    public void InvalidDurationIsRejected(int minutes) =>
        Assert.Throws<AppException>(() => Pricing.Calculate(12m, minutes));
    [Fact]
    public void HalfCentRoundsAwayFromZero() =>
        Assert.Equal(0.01m, Pricing.Calculate(0.01m, 30));
    [Fact]
    public void MidnightCrossingUsesPaymentDate() =>
        Assert.Equal(new DateOnly(2026, 11, 15), BakuTime.LocalDate(new DateTime(2026, 11, 14, 20, 15, 0, DateTimeKind.Utc)));
    [Fact]
    public void DayBoundaryUsesBakuOffset()
    {
        var (start, end) = BakuTime.UtcRange(
            new DateOnly(2026, 11, 15));

        Assert.Equal(
            new DateTime(2026, 11, 14, 20, 0, 0, DateTimeKind.Utc),
            start);

        Assert.Equal(TimeSpan.FromDays(1), end - start);
    }
}