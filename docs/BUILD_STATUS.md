# Build and verification status

This deliverable contains a complete source-code implementation and build/run instructions, but **it is not verified as a passing end-to-end build**.

## Verified in the authoring environment

- All TypeScript / TSX source files parse successfully with the globally installed TypeScript parser.
- All JSON files parse successfully.
- Project references and directory structure were checked.
- ZIP file archive integrity is verified after creation.

## Not verified here

- .NET SDK/compiler is unavailable in the environment; C# compilation and xUnit execution have not been performed.
- Package registry access is unavailable; npm dependencies could not be installed, so TypeScript type checking and Vite build have not been performed.
- Docker and SQL Server are unavailable; migration execution, SQL concurrency behavior, and HTTP integration tests have not been exercised.
- Browser E2E tests and real-world deployment have not been run.

## First checks on your machine

1. Install Visual Studio 2026 / .NET SDK 10 and Node 22+.
2. Run `dotnet restore PlayDesk.sln` and `dotnet build PlayDesk.sln`.
3. Run `dotnet test PlayDesk.sln`.
4. Run `npm install`, `npm run build` and `npm test` under `src/frontend/playdesk-web`.
5. Start with Docker or LocalDB and follow the acceptance cases in `docs/TESTING.md`.

Use `README.md` for step-by-step setup. This document intentionally distinguishes source completeness from verified runtime correctness.
