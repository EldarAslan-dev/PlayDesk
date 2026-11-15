using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PlayDesk.Application;

namespace PlayDesk.API.Controllers;

[ApiController, Authorize, Route("api/reports")]
public sealed class ReportsController(IPlayDeskService service) : ControllerBase
{
    [HttpGet("daily-revenue")]
    public async Task<ActionResult<RevenueDayDto>> Daily([FromQuery] string? date, CancellationToken ct)
    {
        var parsed = ParseDate(date);
        return Ok(await service.DailyRevenueAsync(parsed, ct));
    }

    [HttpGet("revenue")]
    public async Task<ActionResult<RevenueReportDto>> Range([FromQuery] string? from,
        [FromQuery] string? to, CancellationToken ct)
    {
        return Ok(await service.RevenueAsync(ParseDate(from), ParseDate(to), ct));
    }

    [HttpGet("overview")]
    public async Task<ActionResult<DashboardDto>> Overview(CancellationToken ct) =>
        Ok(await service.DashboardAsync(ct));

    private static DateOnly ParseDate(string? text)
    {
        if (string.IsNullOrWhiteSpace(text) ||
            !DateOnly.TryParseExact(text, "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var result))
            throw AppException.Validation("invalid_date", "Tarix YYYY-MM-DD formatında olmalıdır.");
        return result;
    }
}
