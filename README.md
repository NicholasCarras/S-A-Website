# S&A Lawn Care — standalone website

One website, one deployment, with a private owner dashboard at **`/admin`**. Full editable source is included. The supplied S&A logo appears in the header, footer, page accents, owner login, dashboard, privacy page, and browser icon.

**Start with [SETUP.md](SETUP.md).** This package contains working application code; you must create and connect your own hosting, database, Google, and email accounts before using it with real customers. No paid plan, domain, account, credentials, or existing customer records are included. Nothing is deployed by opening this folder.

## What is included

- Responsive public website, animated lawnmower interaction, scroll transitions, detailed services, about, contact, and quote/visit forms.
- Cloudflare D1 storage for requests and reviews; data does not depend on the visitor’s browser.
- Google owner sign-in restricted to the exact configured owner email.
- Owner request management, date/window editing, calendar overview, and `.ics` export.
- Google Calendar synchronization and conflict checks before visit confirmation.
- Email receipts, status updates, owner alerts, and a durable retry queue with dashboard status.
- Public reviews displayed in a moving carousel, with moderation before publication and private email addresses.
- Input validation, submission rate limits, honeypot, same-origin checks, secure owner sessions, encrypted calendar authorization, and security headers.

## Quick local preview (optional)

Node.js 22.13 or newer is required; Node 24 is recommended for the included tests. Open **this folder** in VS Code, then use its PowerShell terminal:

```powershell
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
Copy-Item .dev.vars.example .dev.vars
pnpm db:local
pnpm dev
```

Open **http://localhost:8787**. Public forms can save locally without external credentials. Configure Google for localhost to use the owner dashboard. Email/calendar tasks remain waiting until valid credentials are set. Local data is separate from the production database. The live setup in SETUP.md does not require running a local server first.

For ongoing visual edits, keep `pnpm dev` running and start `pnpm watch` in a second terminal. Reload the browser after a successful rebuild. Restart the server when changing `.dev.vars`.

## Where to edit

| File | Edit here |
| --- | --- |
| `src/site-content.ts` | Business name, phone, about, services, FAQs, timezone, booking window hours |
| `src/Home.tsx` | Public page layout, lawnmower, quote and visit forms |
| `src/reviews.tsx` | Review form and scrolling display |
| `src/styles.css` | Colors, typography, spacing, responsive styles, animation |
| `src/Brand.tsx` | Shared company logo |
| `public/assets/sa-logo.png` | Supplied logo; replace with a higher-resolution version if available |
| `public/favicon.png` | Browser icon, using the same supplied logo |
| `public/assets/hero.webp`, `garden.webp` | Landscape imagery; replace with actual project photos when ready |
| `src/Dashboard.tsx`, `src/Integrations.tsx` | Owner workspace and connection status |
| `server/` | Authentication, database API, Google Calendar, notifications |
| `migrations/` | Versioned database schema |
| `wrangler.jsonc` | Hosting and database configuration |
| `index.html`, `src/Privacy.tsx` | Search/social metadata and privacy notice |

## Verification

```powershell
pnpm test
pnpm build
pnpm exec wrangler deploy --dry-run
```

Automated tests use an isolated SQLite database and mocked Google/email responses. They exercise authentication, data persistence, deduplication, moderation/privacy, calendar conflicts and rescheduling, failed-job recovery, validation, and daylight-saving time handling. These tests do not authenticate to your real Google account or deliver real email. Finish the launch checks in SETUP.md after connecting your accounts.

See [OPERATIONS.md](OPERATIONS.md) for daily use, backups, limitations, and troubleshooting.
