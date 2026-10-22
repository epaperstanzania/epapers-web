# Deployment and operations

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

Keep both R2 buckets private. Incoming bucket CORS must allow PUT from the four
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
