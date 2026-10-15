# Publish your own S&A Lawn Care website

You deploy **one app**. The public page is `https://your-domain.com/`; the owner signs in at `https://your-domain.com/admin`. There is no second dashboard website to publish. Customers do not need accounts.

You can configure and deploy directly to your live hosting account. Running the website locally is optional. Commands below run in a PowerShell terminal opened in the extracted project folder (the folder containing `package.json`). Replace example domains and emails with yours.

## 1. Accounts and details to have ready

- A Cloudflare account for the Worker website and D1 database.
- Your final website address: a custom domain you own, or your assigned `workers.dev` URL.
- The exact Google email of the owner who will access `/admin`.
- A Google Cloud project for the OAuth client and enabled Calendar API.
- A writable Google Calendar. `primary` uses the owner’s primary calendar. A separate business calendar is useful if you want a dedicated schedule.
- A Resend account and a verified sending domain for customer and owner email notifications. Email delivery to arbitrary customer addresses requires a verified domain; a provider’s test sender is not a production substitute.
- Confirmed business information: service area, about text, and property photos if you want to replace the illustrative landscape images.

Keep credentials in your own account dashboards and secret prompts. Do not put credentials in source files, public frontend variables, screenshots, or messages.

## 2. Install dependencies and create the database

Install Node.js 22.13+ (Node 24 recommended). Then:

```powershell
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm exec wrangler d1 create sa-lawn-care
```

The create command prints a database ID. In `wrangler.jsonc`, replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` with that exact ID. Keep `binding` as `DB` and the database name as `sa-lawn-care` unless you also update the commands in `package.json`.

Apply the schema to the **live** database:

```powershell
pnpm db:remote
```

This creates the tables in your Cloudflare account. Deploying updated code later does not erase the database. The migration is for a new, empty database. Previous deployments’ records are not automatically imported.

## 3. Establish the website URL

In `wrangler.jsonc`, set the public `vars`:

```json
"vars": {
  "APP_URL": "https://your-domain.com",
  "GOOGLE_CALENDAR_ID": "primary",
  "EMAIL_FROM": "S&A Lawn Care <bookings@your-domain.com>"
}
```

`APP_URL` must match the actual browser address exactly (scheme and host, without a trailing slash). Use HTTPS for production. Do not leave it as localhost.

If you do not know your assigned `workers.dev` address yet, you may deploy the initial public page to obtain it:

```powershell
pnpm deploy
```

Forms/sign-in are not ready until APP_URL, the database, and the following credentials are configured. Set APP_URL to the returned URL and redeploy. To use your own domain, add a Custom Domain in your Worker’s Cloudflare dashboard under Settings → Domains & Routes, then use that domain consistently in APP_URL and Google settings. Choose one canonical host, including whether it has `www`; redirect other hosts to it.

## 4. Configure Google sign-in and Calendar

In Google Cloud Console:

1. Select/create your project and enable **Google Calendar API**.
2. Open **Google Auth Platform** (or OAuth consent screen). Configure the app name “S&A Lawn Care,” owner support email, and your website domain. Supply your homepage and `https://your-domain.com/privacy` where requested.
3. Choose the audience appropriate for the owner’s account. For an external app in Testing, add the owner’s exact Google account as a test user.
4. Configure these scopes: `openid`, `email`, and `https://www.googleapis.com/auth/calendar.events`.
5. Create an **OAuth client ID → Web application**.
6. Add this exact **Authorized redirect URI**:

   `https://your-domain.com/auth/callback`

7. Optional local development: also add `http://localhost:8787/auth/callback`. This server-side OAuth flow does not require a JavaScript origin.
8. Copy the client ID and client secret into the secure Wrangler prompts below.

For reliable ongoing calendar sync, do not leave a production calendar app in **Testing**: Google generally expires its refresh token after seven days when Calendar access is requested. Set the appropriate production publishing state and satisfy any verification requirements shown in your Google console. A limited owner-only app may qualify for Google’s personal-use verification exception; follow the rules applicable to your account. Workspace administrators can impose additional restrictions.

If using a dedicated calendar, create it in the owner’s Google Calendar and copy its **Calendar ID** from Settings → Integrate calendar into `GOOGLE_CALENDAR_ID`. The owner must be able to edit it. Choose the calendar before taking real bookings; existing requests retain their originally linked calendar.

## 5. Set server secrets

Each command prompts privately for its value:

```powershell
pnpm exec wrangler secret put ADMIN_EMAIL
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm exec wrangler secret put TOKEN_ENCRYPTION_KEY
pnpm exec wrangler secret put RESEND_API_KEY
```

- `ADMIN_EMAIL`: the owner’s exact Google sign-in email. Only this account is accepted.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: values from your Web application OAuth client.
- `TOKEN_ENCRYPTION_KEY`: a random 32-byte key represented as 64 hexadecimal characters.
- `RESEND_API_KEY`: a sending key from your Resend account, scoped to the verified domain where supported.

Generate an encryption key locally:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Paste that generated value into the `TOKEN_ENCRYPTION_KEY` prompt. Save a secure copy in your password manager. It encrypts Google’s refresh token in your database; changing it requires reconnecting Google.

In Resend, add your sending domain, configure the DNS verification records it provides, and wait for verification. `EMAIL_FROM` must use that verified domain. Owner alerts go to `ADMIN_EMAIL`; customer receipts go to the email on their form. Google Calendar events do not send invitations to customers. No automated SMS service is included.

## 6. Deploy and connect the owner

```powershell
pnpm test
pnpm deploy
```

Open `https://your-domain.com/admin`, click **Sign in with Google**, choose the exact owner account, and allow Calendar access. This stores encrypted offline authorization for background synchronization. No separate dashboard deployment is needed.

The dashboard displays calendar/email configuration and queued or failed work. Click **Retry waiting tasks** after fixing credentials. A cron trigger in `wrangler.jsonc` retries pending work every five minutes; verify that this trigger appears under your Worker’s Triggers after deployment.

## 7. Check the actual live services before inviting customers

Use your own contact details for a test submission so you can verify delivery:

1. In a signed-out/private window, submit a quote. Check the reference number and that `/admin` requires sign-in.
2. As the owner, verify the request and both receipt/owner notification emails. Check spam folders and the Resend delivery log.
3. Request a visit. Verify a tentative, non-blocking event in the chosen Google Calendar. Confirm the request in the dashboard; verify the event now blocks the configured two-hour window and the customer receives the status email.
4. Create a busy event in the chosen calendar and try to confirm an overlapping request. The dashboard should reject it. Remove your test event afterward.
5. Change the visit date in the dashboard; verify the existing Google event updates. Mark it declined; it should be labeled declined and become non-blocking.
6. Submit a test review. Verify it is invisible publicly until approved and its email address never appears in the public review response.
7. Sign out and verify the owner API no longer returns records.
8. Check the public site and new logo on phone and desktop, including keyboard navigation and reduced-motion settings.
9. Make a database backup, review current hosting/email quotas, and enable the account’s usage/billing alerts before promoting the site.

## Optional local work

```powershell
Copy-Item .dev.vars.example .dev.vars
pnpm db:local
pnpm dev
```

Edit `.dev.vars` with local credentials, with APP_URL set to `http://localhost:8787`. Use that exact URL in the browser. Use a separate test Google project/calendar and test sender where possible. `.dev.vars` is ignored and never needed in the downloadable production build.

Local records live in `.wrangler/state`. Live records live in your D1 database; they are not automatically copied between environments. Cron triggers are not automatically run as a normal local schedule; local form submissions and the dashboard retry button process jobs.

## Official setup references

- Cloudflare Worker assets: https://developers.cloudflare.com/workers/static-assets/
- D1 migrations: https://developers.cloudflare.com/d1/reference/migrations/
- D1 commands and exports: https://developers.cloudflare.com/d1/wrangler-commands/
- Google server-side OAuth: https://developers.google.com/identity/protocols/oauth2/web-server
- OAuth token lifetime: https://developers.google.com/identity/protocols/oauth2
- Google scope verification and exceptions: https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification
- Calendar events: https://developers.google.com/workspace/calendar/api/v3/reference/events/insert
- Resend domain setup: https://resend.com/docs/dashboard/domains/introduction
- Resend idempotency: https://resend.com/docs/dashboard/emails/idempotency-keys
