# PLAYDESK

**Real-Time Gaming Club Management Platform** — ASP.NET Core 10, SQL Server, EF Core, React 19, TypeScript, Vite, SignalR, Tailwind CSS 4, and Recharts.

PlayDesk provides table occupancy, countdowns, customer registration, payments, daily Baku-time revenue, admin settings, real-time UI sync, and a dark gaming dashboard.

> This is a reference/portfolio implementation, not a certified POS or accounting system. External banking payments are not processed.

## Quick start: Docker (recommended)

Requires Docker Engine / Docker Desktop, with enough memory for SQL Server (recommend 4GB+ free). Use an x64-compatible host for the SQL Server container.

```powershell
Copy-Item .env.example .env
# Edit .env and set two private strong passwords.
docker compose up --build
```

Open **http://localhost:8088** and sign in with the email/password configured in `.env` (`PLAYDESK_ADMIN_EMAIL` and `PLAYDESK_ADMIN_PASSWORD`). The initial database migration and three tables are applied at startup. The API is internal to Docker; the frontend reverse-proxies `/api` and `/hubs`.

**Security:** Docker setup binds the UI and SQL Server ports to `127.0.0.1`. This is intentionally a *local demo configuration* with Development mode and HTTP. Never expose this compose stack on the public Internet without TLS, secrets management and hardening.

## Local start: Visual Studio + VS Code (Windows)

Requirements: Visual Studio **2026 (version 18.0+)** with .NET 10 support, .NET SDK 10, SQL Server LocalDB (or SQL Server Express), Node.js 22.12+, and optionally the EF CLI.

1. Open `PlayDesk.sln` in Visual Studio 2026 and set **PlayDesk.API** as startup project.
2. Ensure `src/backend/PlayDesk.API/appsettings.Development.json` has a working LocalDB connection string. LocalDB is installed with the SQL Server Express/Visual Studio data workload.
3. Set an administrator password with **user-secrets**:

   ```powershell
   dotnet user-secrets set "Seed:AdminPassword" "YourPrivateStrongPassword123!" --project src/backend/PlayDesk.API
   ```

   Default development email is `admin@playdesk.local`; change via `Seed:AdminEmail` in user-secrets if desired.

4. Start the API using Visual Studio's `http` launch profile, or:

   ```powershell
   dotnet restore PlayDesk.sln
   dotnet run --project src/backend/PlayDesk.API --launch-profile http
   ```

5. API is served at **http://localhost:5074**. Open **http://localhost:5074/scalar/v1** for the Scalar API reference. The dev API automatically runs its bundled EF migration and seeds 3 tables.
6. In VS Code open `src/frontend/playdesk-web` and run:

   ```powershell
   npm install
   npm run dev
   ```

7. Open **http://localhost:5173**, log in and start creating sessions.

> Don't run `dotnet ef database update` against a database already created by `EnsureCreated`; this project uses migrations from the beginning. Avoid running multiple startup migrations in production.

## Project layout

```text
PlayDesk/
├── PlayDesk.sln
├── src/
│   ├── backend/
│   │   ├── PlayDesk.Domain/          # Entities and roles
│   │   ├── PlayDesk.Application/     # Services, DTOs, pricing, interfaces
│   │   ├── PlayDesk.Infrastructure/  # EF Core, repository, migration, seed
│   │   └── PlayDesk.API/             # Controllers, auth, SignalR, Scalar
│   └── frontend/playdesk-web/       # React + TypeScript
├── tests/PlayDesk.UnitTests/
├── docs/                            # Architecture, ERD and tests
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## Business rules

- Customer name: 1–120 characters, duplicates allowed.
- Session duration: 30–1440 minutes, 30-minute increments.
- One active session per table; expiration does not release it until payment.
- Price is calculated by API using the rate at session start (`HourlyRateSnapshot`).
- One payment per session, guaranteed by a unique database constraint and rowversion protection.
- Payment and session closure succeed or fail together (EF transactional `SaveChanges`).
- Paid local date is stored on receipt for efficient indexed daily aggregation in `Asia/Baku`.
- Operator can handle sessions; only Admin can update table rate or availability.
- Multiple operator screens reconcile through SignalR and periodic API refetch.

## Endpoints

| Method | URL | Function |
|---|---|---|
| GET | `/api/auth/csrf` | Request anti-CSRF token |
| POST | `/api/auth/login` | Authenticate |
| POST | `/api/auth/logout` | Sign out |
| GET | `/api/auth/me` | Current identity |
| POST | `/api/customers` | Create customer (201) |
| GET | `/api/customers?search=` | Search customers |
| GET | `/api/customers/{id}` | Customer details |
| GET | `/api/audit?take=20` | Recent audit trail (Admin) |
| GET | `/api/users` | List users (Admin) |
| POST | `/api/users` | Create operator/admin (Admin) |
| PATCH | `/api/users/{id}/active` | Enable/disable account (Admin) |
| GET | `/api/tables?isAvailable=true` | Available tables |
| PATCH | `/api/tables/{id}/rate` | Change rate (Admin) |
| PATCH | `/api/tables/{id}/availability` | Enable/disable (Admin) |
| POST | `/api/sessions` | Start a session (201) |
| GET | `/api/sessions?activeOnly=true` | Session list |
| GET | `/api/sessions/{id}` | Session details |
| POST | `/api/sessions/{id}/payment` | Record payment (201) |
| GET | `/api/reports/daily-revenue?date=2026-11-14` | Daily revenue |
| GET | `/api/reports/revenue?from=2026-11-01&to=2026-11-14` | Range + day buckets |
| GET | `/api/reports/overview` | Dashboard summary |

Unsafe HTTP operations require the `X-CSRF-TOKEN` header (from `/api/auth/csrf`) and cookie credentials. The React app handles both automatically. When testing in Scalar, first obtain the CSRF token, set it in the request header, and authenticate before protected calls.

## Database & migration

An initial SQL Server migration is included in `PlayDesk.Infrastructure/Migrations` and automatically applied in Development mode. Future migrations:

```powershell
dotnet tool install --global dotnet-ef --version 10.*
dotnet ef migrations add MyChange --project src/backend/PlayDesk.Infrastructure --startup-project src/backend/PlayDesk.API
dotnet ef database update --project src/backend/PlayDesk.Infrastructure --startup-project src/backend/PlayDesk.API
```

Run migrations as a **separate deployment job** in real production, and set `Database:ApplyMigrationsOnStartup` to false. Schema and seed logic should be code-reviewed before promotion.

## Testing / build

```powershell
dotnet test PlayDesk.sln
cd src/frontend/playdesk-web
npm test
npm run build
```

See `docs/TESTING.md` for manual validation, concurrency, fault injection, and current test coverage limitations.

## Production considerations

- This repository uses cookie auth and `PasswordHasher`; for exposed multi-user deployments, use full ASP.NET Core Identity or an OIDC provider and implement credential recovery and account lifecycle.
- In a public deployment enforce TLS, configure `ForwardedHeaders` with trusted proxy IPs, apply CSRF and origin controls to WebSocket connections, use structured logs, backups, secrets vault, and monitoring.
- For truly concurrent maintenance transitions and session creation, serialize their table-level state changes with SQL locking or an explicit transactional command.
- `Card` is a manual POS receipt record. No external provider authorization or automatic refunds are implemented.
- No guarantee of exactly-once SignalR event delivery: APIs and SQL remain authoritative.
- The SQL Server integration and browser E2E acceptance scenarios are documented but not automated in this version.

## Portfolio highlights

**EF Core + SQL Server** with unique filtered index and rowversion, **transactional payments**, **Baku-local revenue grouping**, **cookie auth + anti-CSRF**, **SignalR UI refresh**, a **React dashboard** with interactive sessions, and **Docker-based local run**.
