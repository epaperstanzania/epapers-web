# Source inventory and migration checklist

The source of truth is the implemented `EpapersApi` handlers, services, Prisma migrations,
tests and OpenAPI, together with `userFrontend/src/App.tsx` and its API adapters.
Original projects and the existing V2 Git metadata must remain untouched. No source
environment or credential files are read or copied.

- **Routes:** retain the public catalogue and information/authentication pages; move
  contributor workflows to contributor, faculty tools to lecturer, and `/admin/*`
  to the console with deliberate legacy redirects. Keep all canonical API routes in web.
- **Data:** copy the CockroachDB schema, all eleven SQL migrations and curriculum seed
  datasets into one database package. Preserve soft deletion, unique reward keys,
  serializable retries, audit history and retention jobs.
- **Authentication:** preserve Argon2id, memory-only access tokens, hashed rotating
  refresh credentials, live database session/role checks, email verification,
  admin email login and session-bound reauthentication.
- **Portal security:** replace single-origin CORS/CSRF with an exact allowlist, validate
  return URLs, keep production cookies Secure/HttpOnly, and use host-only local cookies.
- **Public:** catalogue, search/filter/pagination, recent/popular, department/module/paper
  details, fresh signed PDF URLs, contact, takedown and module requests.
- **Contributor:** upload/complete/submit, submissions, notifications, profile/settings,
  sessions, password change, account export/deletion, achievements and leaderboard.
- **Lecturer:** shared account, verification application/status, papers and bulk upload;
  database verification/department scope controls automatic publication.
- **Admin:** statistics, review, flags, takedowns, paper directory/restoration, curriculum,
  imports, module requests, users, lecturer verification, audit, health, communication,
  notifications and settings with existing reason/reauthentication rules.
- **Operations:** queue worker, encrypted email jobs, scanning, publication, rollups,
  retention, health, environment examples, independent app deployment, migration ownership.
- **Verification:** carry forward API/security tests, add portal-origin/redirect/navigation
  tests, validate strict types, lint, all builds and a frozen dependency install. External
  CockroachDB/R2/email flows must be reported separately from isolated automated tests.

## Source differences requiring deliberate treatment

The old AUTH/UPLOADS documents describe a single APP_ORIGIN and some unfinished phases;
current service implementations include later admin, retention and email-code changes.
Current code takes precedence. Reports/takedowns require authentication. New passwords
use the deployed six-character letter-and-number policy with weak-password rejection.
The scan provider is structural validation, not antivirus. Public metadata can be cached
for five minutes, but every signed URL request checks current publication state.

The frontend uses React Router and Vite environment variables. V2 uses actual App Router
route files and nested layouts, with a small Next navigation adapter for migrated
interactive components. No BrowserRouter or Vite runtime is retained. Interactive
workflow components are shared in UI; public discovery should also render on the server.
