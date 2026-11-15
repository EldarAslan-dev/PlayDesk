# Verification plan

## Automated tests bundled

```powershell
dotnet test PlayDesk.sln
cd src/frontend/playdesk-web
npm test
npm run build
```

The bundled backend tests verify pricing validation, rounding and Baku date handling. Frontend tests cover date helpers. No automated SQL Server integration or browser E2E test suite has been executed in this delivery environment.

## Full manual acceptance sequence

1. Start services and sign in as administrator.
2. Create a new customer. Confirm the response is HTTP 201 via Scalar.
3. Choose `Table 02` (12 AZN/hour) and start a 90-minute session. The projected amount is 18.00 AZN.
4. Filter `/api/tables?isAvailable=true`. `Table 02` must disappear.
5. Attempt a second session on `Table 02`, which must return HTTP 409.
6. Open the current Baku date report. Before any payments it must have a 0 count and 0 AZN.
7. Collect payment for the session. Confirm HTTP 201, 18 AZN, `Completed` status and table availability.
8. Repeat the payment call: expect HTTP 409 and unchanged revenue.
9. Open two browsers with the same user and verify other clients refresh table state after a session start and payment.
10. Change a table rate after starting a new session and confirm that session's expected price does not change.
11. Test invalid duration (`45`, `-30`, `0`), invalid customer and table IDs, and invalid report date format.
12. Change session/payment timestamps using controlled DB seed data to exercise the Baku midnight boundary. Do not mutate financial data in a real database.
13. To test concurrency, submit two simultaneous POST requests to create sessions on the same table. Exactly one must succeed.
14. For fault injection, force an EF failure between staged payment and close writes; verify they both roll back.

## Production readiness gaps

Before real business deployment, add automated SQL Server integration tests, a Playwright E2E suite, structured tracing, error alerting, database backups, secure password-reset/account lifecycle, SQL locking for maintenance transitions, and payment reconciliation/refund support.
