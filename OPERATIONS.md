# Owner operations and maintenance

## Daily workflow

Visit `/admin` and sign in with the configured Google account. The session lasts up to seven days; signing out invalidates it. Visitors cannot create owner accounts. Keep your Google account protected with two-factor authentication.

New quote and visit requests appear in the dashboard. Contact the customer about scope, location, price, and the requested time before confirming. Save a new date/window when needed. Approve genuine reviews regardless of their star rating; hide spam, abusive content, or private information. Reviews are shown as submitted, without rewriting the customer’s wording.

Check **Calendar & notifications** for tasks needing attention. “Connected” indicates stored Google authorization, not a guarantee of ongoing access. Errors appear when an actual task cannot run. Fix the indicated credential/permission problem, then retry.

## What is stored where

| Information | Location |
| --- | --- |
| Quotes, visit requests, reviews, status, revision history | Your Cloudflare D1 database |
| Hashed owner sessions, temporary OAuth state, encrypted Google refresh token | Your D1 database |
| Notification/calendar task status and retry payloads | Your D1 database |
| Visit details and contact information | Your selected Google Calendar after synchronization |
| Transactional emails and delivery records | Resend and recipients’ mailboxes |
| Landscape images, supplied logo, application files | Your Cloudflare Worker static assets |
| Optional local test data | Your computer’s `.wrangler/state` directory |

No browser-local storage is used as the source of truth for business submissions. A successful form response means the database transaction committed. Notification/calendar jobs are saved in the same transaction. If a provider is down, the request remains in the dashboard.

## Booking and calendar behavior

- Customers request a preferred day/window; this is not an instant guaranteed appointment or a payment transaction.
- Defaults are 9 am for Morning and 1 pm for Afternoon, each reserving two hours, in `America/New_York`. Edit `src/site-content.ts` to change those defaults and update the dashboard/customer wording if changing timezone or hours. Existing events are only recalculated when their requests change.
- A pending visit is a tentative, non-blocking event. Confirmed/completed visits block time. Declined visits remain visible with a DECLINED label and do not block time, preserving an audit record.
- The app checks busy events in the **selected calendar only** before confirming or rescheduling a confirmed visit. If you choose a dedicated business calendar, personal events on a different calendar are not checked.
- A database constraint prevents two confirmed requests in the same day/window. Google and the database are separate systems; an external calendar edit made at the same moment is not an atomic booking lock. Review conflicts in daily operations.
- Sync runs from the website to Google. Editing, moving, or deleting an event directly in Google does not update the website. Manage appointments in `/admin`. A later website edit may recreate or overwrite the app’s event in Google.
- New visits use the configured calendar. Existing visits remain linked to their original calendar ID; changing the setting does not migrate old events.
- An emailed status message is separate from calendar synchronization. Always check failed sync tasks before relying on the external calendar.
- Each calendar job uses a durable event ID to avoid duplicate events across retries. Jobs are leased to avoid simultaneous processing. Email uses provider idempotency keys; Resend retains these for 24 hours, so an ambiguous provider response followed by a much later manual retry can rarely resend an email.

## Background processing and traffic

Tasks run after submissions/owner changes and on a five-minute cron. Failures back off up to one hour and stop after ten attempts, remaining visible for manual retry. Each run processes up to eight jobs. Persistent incoming volume above this drain rate requires a larger batch or a dedicated queue consumer; this is designed for a local service business, not unlimited load.

The website uses a compact Vite build and optimized images. Static assets and the Worker are deployed together. Database indexes support request dates and review status; owner records load in pages. Public reviews display the latest 60 approved submissions. The dashboard currently loads the pages into memory; very large record volumes will benefit from server-side filtering and pagination controls.

Input validation, honeypot, and per-IP hourly rate limits are included. Rate limiting is not a complete bot detector. Enable appropriate Cloudflare abuse controls and monitor submission volume if targeted spam becomes an issue. Configure account spending/usage alerts and review current plan limits; no load test or traffic capacity guarantee is included.

## Backups

Run from the project folder while authenticated to Cloudflare:

```powershell
pnpm exec wrangler d1 export sa-lawn-care --remote --output=sa-backup.sql
```

Store this SQL securely outside the source folder and source-control repository: it contains customer details and security data. Use Cloudflare’s recovery tools according to your account’s retention period. Test restoration into a separate database before depending on a backup. Back up before schema changes. Never apply a full SQL backup on top of a populated production database without a reviewed restoration plan.

## Data correction or removal

The dashboard can change scheduling/status and hide reviews; it does not include a destructive delete button. For a customer correction/deletion request, identify the exact record in the dashboard, make a protected backup if appropriate, then use your Cloudflare D1 console to update/delete that record. Also remove associated jobs and calendar links/revision records, and delete the corresponding Google Calendar event if applicable. Handle email-provider retention separately. Removing a D1 row alone does not erase copies in Google, emails, or backups. Follow your business’s documented retention policy.

## Troubleshooting

| Symptom | What to check |
| --- | --- |
| “Cannot find package.json” | Open the extracted project folder, not its parent or the ZIP itself |
| PowerShell blocks `pnpm.ps1` | Use `pnpm.cmd` for the same commands; no execution-policy change is needed |
| “No such table” | Apply `pnpm db:remote` to live or `pnpm db:local` to local; verify DB binding |
| Address/Origin error | APP_URL must equal the actual browser origin; localhost and 127.0.0.1 differ |
| Google `redirect_uri_mismatch` | Exact HTTPS domain plus `/auth/callback` in the Google Web client |
| “Not the configured owner” | ADMIN_EMAIL must match the verified email returned by the chosen Google account |
| Calendar permission missing | Reconnect Google, allow the calendar permission, and check Workspace policies |
| Google stops syncing after a week | Check OAuth Testing state, production readiness, or revoked/expired authorization |
| Calendar 403/404 | Calendar API enabled, correct calendar ID, and owner has editing permission |
| Email 401/403 | Resend API key, sending-domain verification, and allowed sender |
| Task says failed | Fix configuration, then use “Retry waiting tasks”; inspect provider dashboards |
| Rate limit reached during tests | Wait for the hourly window; test submissions count toward the limit |
| Local edits do not show | Run `pnpm watch` in a second terminal or restart `pnpm dev`, then refresh |

## Verification performed on this package

- TypeScript checking and production frontend build: passed.
- Worker bundling/deployment dry run: passed; no live deployment performed.
- Six automated scenario tests with in-memory SQLite and mocked provider responses: passed.
- Exact supplied logo file used unchanged and referenced across brand placements.
- Credentials, local databases, dependencies, and generated build output excluded from the source ZIP.
- Real-account OAuth, real Google Calendar writes, real email delivery, production load testing, and visual browser QA remain to be checked in your environment using SETUP.md.

Dependencies are pinned in `pnpm-lock.yaml`. Validation used preinstalled matching dependencies; a clean internet dependency installation could not be completed in the build environment because its offline package metadata was incomplete. Run the documented frozen-lockfile install on your computer before deployment, then the included test/build commands.
