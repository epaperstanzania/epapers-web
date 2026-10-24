# Deployment and operations

## Current Vercel setup

The selected hosting profile is four independent Vercel projects:

| Portal | Project / production hostname | Root directory |
| --- | --- | --- |
| Public and API | `epapertz.vercel.app` | `apps/web` |
| Contributor and uploads | `epapertz-contributor.vercel.app` | `apps/contributor` |
| Lecturer | `epapertz-lecturer.vercel.app` | `apps/lecturer` |
| Administrator | `epapertz-admin.vercel.app` | `apps/admin` |

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

When `epapers.co.tz` and its three subdomains are active, set
`NEXT_PUBLIC_DOMAIN_PROFILE=custom` on **all four** Vercel projects and redeploy
them together. The shared portal configuration then switches navigation,
authentication callbacks, API origin and trusted origins to that one domain;
keep the default profile for the current `*.vercel.app` deployment.

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

- `DATABASE_URL`, `DATA_ENCRYPTION_KEY`, `JWT_ACCESS_SECRET`,
  `REFRESH_TOKEN_PEPPER`, `IP_HASH_SALT`.
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

Use CockroachDB-compatible scheduled backups and private R2 retention/versioning
appropriate to the deployment. Keep signing/encryption key recovery material in
the secret manager with restricted access. Restore database and objects into an
isolated environment first; check foreign keys, file references, archived papers,
audit history and encrypted outbox access. Do not run a destructive restore drill
against production. See `source/BACKUP-RESTORE.md` for the inherited operational
policy, translating its old paths to the canonical database and worker packages.

Changing the data-encryption key without a migration makes queued encrypted
emails unreadable. Rotating JWT/refresh secrets revokes access; coordinate it
across web instances and the worker.
