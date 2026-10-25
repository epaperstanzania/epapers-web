# Deployment and operations

## Current Vercel setup

The selected hosting profile is four independent Vercel projects:

| Portal | Project / production hostname | Vercel deployment alias | Root directory |
| --- | --- | --- | --- |
| Public and API | `epapers.co.tz` | `epapertz.vercel.app` | `apps/web` |
| Contributor and uploads | `contributor.epapers.co.tz` | `epapertz-contributor.vercel.app` | `apps/contributor` |
| Lecturer | `lecturer.epapers.co.tz` | `epapertz-lecturer.vercel.app` | `apps/lecturer` |
| Administrator | `console.epapers.co.tz` | `epapertz-admin.vercel.app` | `apps/admin` |

`deployment/portals.json` records these origins. Each app's `vercel.json` installs
from the workspace root and builds only that portal's dependency graph. Enable
source files outside the root directory, Node 24.x and
`ENABLE_EXPERIMENTAL_COREPACK=1`. Migrations are not part of these build commands.
Keep each Vercel project's Root Directory set to the matching `apps/<portal>`
folder; the root install/build commands depend on the monorepo files being
included in the build step.

On Vercel, the application config pins `NEXT_PUBLIC_AUTH_MODE=proxy`,
`NEXT_PUBLIC_API_BASE_URL=/api/v1`, and the four exact public origins from
`deployment/portals.json`. The server config similarly pins `APP_ORIGIN`,
`API_ORIGIN`, `PORTAL_ORIGINS`, host-only cookies, and `TRUST_PROXY=false`.
This prevents local `.env.local` values or stale Vercel overrides from breaking
the Vercel deployment profile. Do not add conflicting origin/cookie overrides
to the Vercel projects.

The four custom domains are assigned to their matching Vercel projects and
their DNS configuration is verified. Set
`NEXT_PUBLIC_DOMAIN_PROFILE=custom` in Production on **all four** Vercel
projects before deploying. The shared portal configuration then switches
navigation, authentication callbacks, API origin and trusted origins to the
branded domains above. Keep `*.vercel.app` only as deployment aliases.

Separate `vercel.app` hosts cannot share a cookie domain. Portal requests to
`/api/v1` are proxied to the canonical API. A portal without a session starts at
`/auth/start`, stores a ten-minute HttpOnly state/PKCE cookie, and visits canonical
`/auth/authorize`. The API creates an encrypted authorization code bound to a
two-minute database session, an exact callback and an S256 challenge. The portal
callback exchanges it server-to-server and sets a host-only refresh cookie.
The grant is consumed transactionally using the existing session tables; no new
migration is required. Its replacement session retains the original family and
absolute expiry, so logout/revocation applies across linked portals. Access tokens
remain in memory. Callback responses are uncached and use `Referrer-Policy:
no-referrer`; neither tokens nor codes belong in application logs.

Use the stable production hostnames for sign-in. Arbitrary preview/deployment
URLs are intentionally not trusted callbacks. Preview UI links point to the
stable portals; full authenticated staging needs its own explicitly configured
origins and isolated backend.

Add these secrets to **Production** in the public project's Vercel settings:

- `DATABASE_URL`, `DIRECT_URL`, `DATA_ENCRYPTION_KEY`, `JWT_ACCESS_SECRET`,
  `REFRESH_TOKEN_PEPPER`, `IP_HASH_SALT`.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` for Google sign-in.
- `EPAPERS_WORKER_TOKEN`, shared with the Cloudflare Cron Worker.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`,
  `R2_INCOMING_BUCKET`, `R2_PUBLISHED_BUCKET`, `R2_PROFILE_BUCKET`.
- `EMAIL_PROVIDER` and the corresponding SMTP credentials/settings or
  `RESEND_API_KEY`; set the verified sender using `EMAIL_FROM`/`SMTP_FROM`.

Use real, independently generated keys; templates are not production values.
Do not add backend secrets to the other three projects. Vercel deployment does
not provision a database, run migrations, or configure bucket CORS. Email
delivery and PDF scan/publication are driven by the Cloudflare Cron Worker below.
Allow the four selected HTTPS origins in private incoming-bucket PUT CORS.
For a safe dry run, apply command, and verification of the live incoming-bucket policy, see [R2 browser upload CORS](source/R2-UPLOAD-CORS.md). This bucket policy is separate from the profile bucket and is not changed by a Vercel deployment.
Create a third private R2 bucket named `profile` and set `R2_PROFILE_BUCKET=profile`
on the public/API project. R2 bucket names must be lowercase. Its PUT CORS
policy must allow `Content-Type` and `If-None-Match` request headers from the
four portal origins (and local development origins when testing locally).
Profile images use direct signed PUTs and a public same-origin read route; do
not enable public bucket access. Configure a short lifecycle rule for abandoned
`pending/` objects; successful uploads move to `profiles/`.

After authenticating the Cloudflare CLI, create the bucket with
`cf r2 buckets create --name profile`. In the bucket CORS settings, use a rule
like this for the current production portals:

```json
[{"AllowedOrigins":["https://epapertz.vercel.app","https://epapertz-contributor.vercel.app","https://epapertz-lecturer.vercel.app","https://epapertz-admin.vercel.app"],"AllowedMethods":["PUT"],"AllowedHeaders":["Content-Type","If-None-Match"],"MaxAgeSeconds":3600}]
```

Add `http://localhost:3000`, `http://localhost:3002`, `http://localhost:3003`
and `http://localhost:3004` only for local testing. Change the production
origins together with `NEXT_PUBLIC_DOMAIN_PROFILE=custom` when the custom
domain is activated.

Do not copy `.env.local`, `.env.example`, or `VERCEL_OIDC_TOKEN` into Vercel.
The code sets the public Vercel profile itself. Add only the actual backend
secrets to the public/API project's Production Environment Variables; do not
add backend secrets to the other three projects. Keep migrations in the
release job, not the build command.

On Vercel, rate limiting uses the platform-overwritten `x-vercel-forwarded-for`
header. Keep `TRUST_PROXY=false` there; that option is for restricted Cloudflare
ingress on other hosts.

## Supabase PostgreSQL and Google sign-in

The active Prisma migration history is now PostgreSQL-only. The previous
CockroachDB migrations are preserved under
`packages/database/prisma/cockroach-migrations` for reference and must not be
applied to Supabase. The new `0000_postgresql_baseline` creates the current
application tables, indexes, constraints and default settings in a **fresh**
Supabase project's `public` schema. `0001_supabase_api_permissions` enables
row-level security and removes browser-role grants on EPapers tables, including
Prisma migration history. EPapers accesses these tables through Prisma using
its server-side database role; Supabase Auth is used only for Google identity.
Neither migration copies data from CockroachDB.

1. Set `DATABASE_URL` to the Supabase transaction pooler on port 6543 and
   `DIRECT_URL` to the direct connection or IPv4-compatible session pooler on
   port 5432. Use the actual project password; do not put either URL in Git.
   Set both values in the migration environment and the public/API Vercel
   project. `DATABASE_URL` is used by the running Prisma client and
   `DIRECT_URL` by Prisma Migrate. For the shared transaction pooler, use
   `pgbouncer=true&sslmode=require` as in `.env.example`. Keep a shared
   Prisma Client per warm Vercel instance. The former `connection_limit=1`
   option failed URL validation in this project's Prisma runtime and must be
   removed from Vercel and local `DATABASE_URL` values.
2. On an empty target, run `pnpm --filter @epapers/database generate`, then
   `pnpm --filter @epapers/database migrate`. Verify the application tables,
   default `app_settings`, and three achievement definitions before enabling
   traffic. Do not run the baseline against a populated target database.
3. If retaining existing EPapers data, stop writes to the old database and
   back up both databases. Run `node scripts/migrate-cockroach-data.mjs` for a
   read-only snapshot check, then `node scripts/migrate-cockroach-data.mjs
   --apply` to import into the empty Supabase tables. The script reads
   `LEGACY_DATABASE_URL` from `apps/web/.env.local` and `DIRECT_URL` from the
   root `.env.local` unless `SOURCE_DATABASE_URL` and `DIRECT_URL` are provided
   as process environment variables. It preserves primary keys and imports
   all application records in one rollback-safe transaction; it does not copy
   CockroachDB migration metadata. Compare table counts and representative
   papers, users and sessions with `node scripts/migrate-cockroach-data.mjs
   --verify` before changing Vercel's `DATABASE_URL`. Content verification
   excludes the old worker's continuously updated heartbeat value. If old
   site writes continue after the first import, pause them and run the script
   with `--sync` in a maintenance window. It upserts changed records, prunes
   expired sign-in challenges, and stops if any other destination-only record
   needs manual reconciliation.
4. In **Google Cloud Console → OAuth client → Authorized redirect URIs**, use
   `https://udhugsfauuqsmbktulqu.supabase.co/auth/v1/callback`. This is the
   Google-to-Supabase callback; it does not replace the EPapers callback.
   Configure that Google client in the Supabase Google provider settings.
   Keep the existing Supabase callback until its custom auth domain is active.
5. In **Supabase → Authentication → URL Configuration**, set the Site URL to
   `https://epapers.co.tz` and add
   `https://epapers.co.tz/api/v1/auth/callback/google` to Redirect URLs.
   Add `https://epapers.co.tz/api/v1/auth/callback/google?returnTo=**`
   if cross-portal login uses the optional `returnTo` query. For local
   development add the corresponding `http://localhost:3000` callback URLs.
   Keep production URLs exact apart from the query wildcard.
   Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` on the
   web project and local web env. The browser starts Google sign-in, Supabase
   sends a PKCE code to the EPapers callback, and EPapers exchanges it
   server-side before issuing its own session cookie.

The Google callback accepts only a verified Supabase user with a Google
identity. It links an existing EPapers account only when that account's email
is already verified, and never signs an administrator in without the existing
password and email-code flow. It creates the same EPapers refresh-cookie and
session records as password sign-in. The Supabase service-role key is not used
for this flow and must not be placed in a public environment variable. The
Cloudflare worker token check remains independent of Supabase Auth.

### Google consent screen name

The wording on Google's consent screen is controlled by **Google Auth Platform
→ Branding**, not by the EPapers callback route. Set the app name to **EPapers**,
add its support email, homepage, privacy-policy URL and logo, then submit the
brand for verification. [Google's branding guide](https://support.google.com/cloud/answer/15549049)
states that the verified app name/logo appear on the consent screen. Keep the
Google OAuth client's redirect URI pointed to the Supabase Auth callback above.

The line showing `udhugsfauuqsmbktulqu.supabase.co` is the Supabase Auth host.
Changing the app name alone does not change that host. To brand it, activate a
[Supabase custom domain or vanity subdomain](https://supabase.com/docs/guides/platform/custom-domains)
such as `auth.epapers.co.tz`, add
`https://auth.epapers.co.tz/auth/v1/callback` to the Google OAuth client's
Authorized redirect URIs, and update `NEXT_PUBLIC_SUPABASE_URL` on the web
project only after Supabase has provisioned and verified the custom host.
Supabase custom domains are a paid add-on; retain the current project host
until the custom host is active.

### 2026/27 DIT curriculum

`docs/source/dit_prospectus_2026_2027.docx` is source data, not operational
instructions. `scripts/extract-prospectus.py` checks its SHA-256 before
regenerating `packages/database/prisma/seed/prospectus-2026-2027.json`.
The checked extraction has 1,300 program/module mappings for 27 programs.
Nineteen ambiguous source rows are excluded and recorded in
`docs/source/prospectus-module-review.json`; resolve them against an authoritative
DIT syllabus before entering them manually. Programs without module tables in
the supplied prospectus remain available in the directory without invented
modules.

Apply `0002_modules_shared_codes` before importing: it allows the same module
code in different programs, while keeping `(program, code)` unique. The seed
is additive and repeatable; it inserts missing modules and fills missing
`levelYear` only when the existing semester agrees with the source. It does
not overwrite paper-linked modules. It stores semester 1 or 2 within each
program year; the directory displays `year 1 → semesters 1–2`, `year 2 → 3–4`,
and so on. For an authorized local migration environment with `.env.local`:

```powershell
node --env-file=.env.local packages/database/node_modules/prisma/build/index.js migrate deploy --schema packages/database/prisma/schema.prisma
node --env-file=.env.local --conditions=react-server --import tsx packages/database/prisma/seed.ts
```

Admin stats, audit logs and curriculum routes read the same PostgreSQL database
through the web/API project's server-side Prisma client. The admin portal
proxies authenticated API requests to that project. For production to show
this Supabase data, the web/API Vercel project's `DATABASE_URL` and `DIRECT_URL`
must point to the migrated Supabase database, and the project must be redeployed
after those environment variables are changed. Never put database credentials
in the admin portal's client environment.

## Public catalogue cache

The public department, program, and module directory pages cache only their
curriculum DTOs in the web project's Next.js Data Cache for 60 seconds. Admin
create, edit, archive, delete, CSV import, and approved module-request routes
expire the shared `public-catalogue-structure` tag after a successful write;
CSV dry runs do not expire it. The pages remain dynamically rendered, and
papers, search results, sessions, and account data are not included in this
server cache. A failed cache invalidation is logged and the 60-second TTL is
the fallback.

Public API metadata responses separately use browser/CDN HTTP caching
(`max-age=60`, `s-maxage=300`). Next.js tag invalidation does not purge an
already cached CDN API response, so other portals may see older metadata until
that HTTP TTL expires. Do not rely on browser storage being shared among the
current separate `*.vercel.app` hosts.

## Cloudflare background worker

Only the scheduler is deployed to Cloudflare Workers. The existing Vercel web/API
project runs each bounded job batch in its Node.js runtime, preserving Prisma,
R2, SMTP, and Resend support. The Cloudflare Cron Worker calls the private
`POST /api/internal/worker/process` endpoint once per minute. Each request can
process at most 20 jobs and runs for at most 45 seconds; database job leases
protect against overlapping or retried invocations.

The Worker calls the public API origin `https://epapertz.vercel.app`. Deploy the
web/API project with a high-entropy `EPAPERS_WORKER_TOKEN` in its Production
environment first. Use the exact same token as the Cloudflare Worker secret.
Generate a separate token for staging. Never commit or print either token.

From the repository root, install dependencies and generate the Cloudflare
Worker types:

```powershell
pnpm install --frozen-lockfile
pnpm --filter @epapers/worker types:cloudflare
```

Create `worker/.secrets` as an ignored local file containing only:

```text
EPAPERS_WORKER_TOKEN=<same random token configured in Vercel>
```

After the Vercel deployment containing the authenticated endpoint is live, deploy
only the Worker from its directory:

```powershell
Push-Location worker
cf auth whoami
cf deploy --dry-run --secrets-file .secrets
cf deploy --secrets-file .secrets
Pop-Location
```

The typed project config in `worker/cloudflare.config.ts` names the Worker and
installs a `*/1 * * * *` Cron Trigger. Verify deployment in the Cloudflare
dashboard under **Workers & Pages → epapers-background-worker → Triggers** and
inspect its invocation logs. Cron changes can take several minutes to propagate.
Successful runs log `Scheduled worker batch completed` with a processed count;
`processed: 0` means the endpoint ran but there were no due jobs. Confirm the
database `workerHeartbeat` setting advances and monitor failed/retrying jobs.

Do not deploy the Vercel portals as part of a Worker-only release. Do not run
database migrations from the Cron Worker; keep migrations in the existing
release process. The Node worker entrypoint remains available for local or
non-Cloudflare operation.

## Local development

`pnpm dev` supplies nonsecret localhost origins for ports 3000, 3002, 3003 and
3004, uses the same proxy sign-in flow, and leaves backend secrets to your own
local environment. It does not read or copy secret files. Vercel's Development
environment uses the same localhost profile; Production uses HTTPS hostnames.
Root `.env.local` is not automatically loaded by each Next app: configure the
web backend's secrets in `apps/web/.env.local` yourself or inject them into the
process. See `.env.example` for required keys.

The shared custom-domain configuration below remains available when
`epapers.co.tz` is registered and its DNS is ready. Replace all public and backend
origins together and redeploy all portals when switching profiles.

## Four independent deployments

Install from the repository root with `pnpm install --frozen-lockfile`. Build a
portal and its dependencies with `pnpm exec turbo run build --filter=@epapers/web...`
(replace web with contributor, lecturer or admin). Use `pnpm --filter @epapers/web
start` in a workspace deployment, or package the traced standalone output with
the app's public and `.next/static` directories for a container deployment.
Standalone paths preserve the monorepo layout: the web entry is
`apps/web/.next/standalone/apps/web/server.js`. Copy public/static next to that
entry. Build and run on the same operating system/architecture for Prisma and
Argon2 native binaries. A Windows build is not a Linux deployment artifact.

Do not run migrations from app build/start hooks. A single release job owns
`pnpm db:migrate` once per environment. Roll out compatible application versions
after that job succeeds. Migration 0011 stores Test 1/Test 2 separately and only
backfills legacy papers whose title or exam period explicitly identifies a
number; ambiguous legacy tests remain unnumbered. All portals use the same
schema and API version.

## Environment ownership

Web and worker require the server keys documented in their `.env.example` files.
The database migration job requires only its database connection. Contributor,
lecturer and admin require public portal/API origins; do not provision R2, SMTP,
database credentials or signing keys to those UI deployments.

Set these public values at build time in all portals:

```text
NEXT_PUBLIC_API_BASE_URL=https://epapers.co.tz/api/v1
NEXT_PUBLIC_WEB_ORIGIN=https://epapers.co.tz
NEXT_PUBLIC_CONTRIBUTOR_ORIGIN=https://contributor.epapers.co.tz
NEXT_PUBLIC_LECTURER_ORIGIN=https://lecturer.epapers.co.tz
NEXT_PUBLIC_ADMIN_ORIGIN=https://console.epapers.co.tz
```

On web/worker set `APP_ORIGIN` and `API_ORIGIN` to `https://epapers.co.tz`, and
`PORTAL_ORIGINS` to the exact comma-separated four origins above. A host-only
refresh cookie is sufficient because every refresh is sent to the canonical web
host. If infrastructure requires a shared cookie, `COOKIE_DOMAIN=.epapers.co.tz`
is supported; use the same setting for login, refresh and logout. Cookies remain
HttpOnly, Secure, SameSite=Lax, scoped to `/api/v1/auth`. Local development uses
host-only cookies without Secure on HTTP localhost; production always uses Secure.

Only enable `TRUST_PROXY=true` when network ingress is restricted to a proxy that
overwrites `cf-connecting-ip`. Otherwise IP buckets intentionally share the
untrusted-client identity, and account limits still apply. Configure this before
public release to avoid a shared public IP limit.

Keep all three R2 buckets private. Incoming and profile bucket CORS must allow PUT from the four
exact origins, with Content-Type and If-None-Match headers. Storage requests omit
API cookies/tokens. Apply an appropriate private-object lifecycle consistent with
database retention. Published URLs remain short-lived; do not configure public
bucket access as a shortcut.

The secure session iframe at `/auth/session-bridge` must be embeddable by the
four trusted portal origins. Do not set a blanket SAMEORIGIN/X-Frame-Options or
`frame-ancestors 'self'` policy on that route. Other pages should deny framing.

## Release verification

1. Validate secrets and exact origins, database connectivity, private bucket CORS
   and the email provider using a development/staging environment.
2. Apply migrations once. Seed curriculum only when appropriate; seed does not
   create users or modules. Provision administrators through an audited operator
   process; never expose a registration role field.
3. Start web and worker, then deploy the three portal builds with matching origins.
4. Exercise registration/email login; navigate between portals; refresh and sign
   out; verify denied roles and rejected untrusted origins.
5. Upload a disposable PDF; complete and submit it; let the worker scan; review
   as an administrator; download via a fresh signed URL. Test marking schemes,
   rejected files, revoked sessions, lecturer department scoping and an audited
   sensitive mutation.
6. Monitor `/api/v1/health`, protected admin health, failed/retrying jobs, email
   budget, scan/publication latency and database serialization failures.

## Backup and restore

Use PostgreSQL-compatible scheduled backups and private R2 retention/versioning
appropriate to the deployment. Keep signing/encryption key recovery material in
the secret manager with restricted access. Restore database and objects into an
isolated environment first; check foreign keys, file references, archived papers,
audit history and encrypted outbox access. Do not run a destructive restore drill
against production. See `source/BACKUP-RESTORE.md` for the inherited operational
policy, translating its old paths to the canonical database and worker packages.

Changing the data-encryption key without a migration makes queued encrypted
emails unreadable. Rotating JWT/refresh secrets revokes access; coordinate it
across web instances and the worker.
