# EPapers V2: Architecture Analysis and Master Build Prompt

This document records the current EPapers architecture and provides a copy-ready prompt for rebuilding it as a pnpm + Turborepo monorepo rooted at `D:\projects\epapers\EpapersV2`.

## Part I — What the existing EPapers application is

### Product

EPapers is a single-institution (DIT) academic past-examination-paper archive. Its curriculum hierarchy is:

```text
Department → Program → Module → Examination paper
```

Papers include exam categories (TEST, UE, SUPP), academic year, semester, exam period, and optionally a marking scheme. The product serves three audiences through role-specific experiences:

1. **Guests and students:** browse departments, programs, modules, papers; search and filter; preview PDFs; view recent/popular papers; download approved papers; use public information, contact, and takedown pages.
2. **Contributors and lecturers:** register and verify email; sign in; upload papers; track submissions; manage profile/settings; receive notifications; earn XP/achievements; use the leaderboard. Lecturers can apply for verification and have lecturer-specific paper/bulk-upload tools.
3. **Administrators:** review papers; handle reports and takedowns; manage curriculum, users, lecturer verification, module requests, announcements, contact messages, settings, and system health; inspect audit history; perform sensitive actions only after reauthentication.

### Existing system boundaries

The current product is split across two applications:

- **Frontend:** a React 19 + TypeScript single-page application built with Vite. `userFrontend/src/App.tsx` defines React Router routes and lazy-loads guest, contributor, and admin pages. Layouts provide distinct shells for those roles, while shared components handle forms, feedback, loading, PDF display, and account controls.
- **Backend:** a separate Next.js App Router application in `EpapersApi`. Route handlers under `app/api/v1/**/route.ts` expose the `/api/v1` contract. The handlers delegate to typed service modules in `src/modules`, shared infrastructure in `src/lib`, and Prisma repositories/database access.
- **Database:** CockroachDB, accessed through Prisma. The schema and migrations cover curriculum, users and sessions, papers and stored files, moderation, XP and achievements, notifications, announcements, audit, auth challenges, rate limiting, and background-job state.
- **PDF storage:** Cloudflare R2 using the S3 API. The browser requests a presigned upload, sends the actual PDF bytes directly to storage, then completes the upload through the API. The API issues short-lived signed read/download URLs; it does not invent or serve fake PDFs.
- **Background work:** a worker in the backend repository handles work that should not run in a request, including email delivery and other queued/maintenance tasks. The worker is a separate process, but belongs to the same application codebase.
- **Email and authentication:** email verification and password recovery use codes/links delivered through a queued email provider. Access tokens are held in browser memory; refresh tokens are HTTP-only cookies and are rotated. Admin login and sensitive admin mutations have additional email-code checks.

The intended V2 topology is **one pnpm/Turborepo monorepo containing several independently deployable Next.js portals and shared packages**. The user explicitly requires `apps/admin`, `apps/contributor`, `apps/lecturer`, `packages/database`, and `packages/auth`. Keep the public discovery experience as `apps/web` at `epapers.co.tz`; it is required to preserve the current guest-facing product. Keep the canonical `/api/v1` route handlers in `apps/web` unless deployment constraints require a separately agreed API app. Shared server-side business services belong in a server-only workspace package, not duplicated across portals. A worker may run as a separate process from this same repository.

### Frontend information architecture

The current routes are the best inventory of the visible product:

- Public: `/`, `/search`, `/departments`, `/departments/:dept`, `/modules/:code`, `/papers/:id`, `/recent`, `/popular`, `/how-it-works`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`, `/takedown`, `/request-module`, `/offline`, `/rate-limit`, `/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password`.
- Contributor/lecturer: `/dashboard`, `/upload`, `/dashboard/submissions`, `/dashboard/achievements`, `/leaderboard`, `/u/:username`, `/dashboard/notifications`, `/dashboard/settings`, `/dashboard/request-module`, `/help`, `/lecturer/papers`, `/lecturer/bulk-upload`.
- Admin: `/admin`, `/admin/review`, `/admin/flags`, `/admin/takedowns`, `/admin/module-requests`, `/admin/papers`, `/admin/structure`, `/admin/users`, `/admin/lecturers`, `/admin/audit`, `/admin/health`, `/admin/communications`, `/admin/notifications`, `/admin/settings`.

The current app uses route-level lazy loading. V2 should preserve the information architecture and URLs where practical, while using App Router layouts, nested pages, and server rendering where appropriate. Public routes belong in `apps/web`; contributor routes belong in `apps/contributor`; lecturer-only workflows belong in `apps/lecturer`; admin routes belong in `apps/admin`. Where legacy routes are retained on a different subdomain, provide deliberate redirects or links rather than broken routes.

### Design language

The existing UI is a clean academic product, not a generic admin template:

- Brand palette: deep blue `#0049A4`, dark sidebar blue `#00337A`, cyan `#00AEE3`; slate text; light blue-gray canvas; white/light surfaces. Admin uses deep navy `#0B1B33`.
- Typography: Inter for interface/body text, Plus Jakarta Sans for display/headings, and monospaced tabular numerals for module codes and metrics.
- Four portal shells: minimal public discovery; blue contributor workspace; lecturer workspace with lecturer-specific navigation/actions; dense, dark-navy admin console. Desktop side navigation has expanded/collapsed states; small screens use a drawer and bottom navigation where appropriate.
- Reuse the existing logo asset only by copying it into the V2 project; do not make the new project depend on files outside its root at runtime.
- Maintain keyboard focus visibility, reduced-motion support, responsive layouts, useful loading/empty/error states, and readable contrast.

### Domain and operating invariants to preserve

- Curriculum is Department → Program → Module. Public catalogue queries must not expose inactive/deleted curriculum or unapproved papers.
- Roles and permissions are decided on the server from the current user/session, never trusted from form fields, URL parameters, or client state.
- Passwords are securely hashed; refresh credentials are not stored in plaintext; sessions can be revoked; generic recovery/registration responses avoid account enumeration.
- Validate request bodies, query parameters, identifiers, uploads, and environment variables. Rate-limit authentication and other abuse-sensitive operations. Protect cookie-authenticated mutations against CSRF and enforce configured origins.
- Keep signed object URLs short-lived and out of persistent browser storage. Never send API credentials to the object-storage URL.
- Upload handling must validate the PDF and its metadata, apply size/type limits, track scan/moderation status, and only publish a paper when the server-side policy permits it.
- Admin mutations need authorization, an explicit reason where the existing API contract requires it, reauthentication for sensitive operations, and audit logging.
- Preserve soft-delete/retention, restoration, takedown, and audit semantics from the current implementation instead of replacing them with hard deletes.
- Use cursor pagination and database indexes for catalogue and administrative lists. Do not claim a search is indexed or performant without measuring the actual query plan and workload.
- Surface operational failures honestly. Do not silently fall back to demo records or report a successful upload/download when the backing service failed.

### Source-of-truth and migration warning

The existing backend contains both implemented code and an older planning document (`EpapersApi/backend.md`). That blueprint may not reflect later implementation decisions. For V2, inspect the current route handlers, service/schema validation, Prisma schema, SQL migrations, tests, OpenAPI document, and frontend API adapters together. Treat the behavior implemented and verified by those sources as authoritative; resolve disagreements explicitly and document any intentional change. Do not copy the old blueprint blindly.

Useful source references in the existing project include:

- `EpapersApi/README.md`, `EpapersApi/docs/FRONTEND-INTEGRATION.md`, `EpapersApi/docs/AUTH.md`, `EpapersApi/docs/ADMIN.md`, `EpapersApi/docs/UPLOADS-MODERATION.md`
- `EpapersApi/prisma/schema.prisma` and `EpapersApi/prisma/migrations/`
- `EpapersApi/docs/openapi.yaml`
- `userFrontend/README.md`, `userFrontend/API-INTEGRATION.md`, `userFrontend/src/App.tsx`, `userFrontend/src/services/api.ts`, `userFrontend/src/types/index.ts`, `userFrontend/src/index.css`

## Part II — Copy-ready master prompt for the V2 build

```text
You are the senior product engineer responsible for building EPapers V2.

## Mission

Build the same complete EPapers product that exists in the source project at
D:\projects\epapers, as a pnpm-workspaces + Turborepo monorepo rooted at:

D:\projects\epapers\EpapersV2

The monorepo contains independently deployable Next.js portal applications and
shared workspace packages. Both frontend and backend code live in this one
repository; do not recreate separate repositories/services or a Vite frontend.
Use Next.js App Router pages/layouts for each portal, a canonical `/api/v1`
backend, and shared server-side packages for domain logic. A background worker
is permitted when necessary, but it must live in this repository and share its
types, database, and services.

This is an implementation task, not a proposal or mockup. Inspect the existing
application first, then build and verify working features in coherent phases.
Do not stop after generating a landing page, static UI, architecture plan, or
placeholder API.

## First: inspect and establish the truth

1. Work only inside D:\projects\epapers\EpapersV2. Do not modify, delete, or
   relocate the original `userFrontend` or `EpapersApi` projects.
2. Preserve any existing `.git` metadata in the V2 target. Do not initialize a
   nested repository or alter Git history.
3. Inspect the existing frontend routes, layouts, pages, shared components,
   types, styling, API client, and integration documentation.
4. Inspect the existing backend route handlers, services, schemas, environment
   validation, Prisma schema, every relevant SQL migration, worker, tests, and
   OpenAPI contract.
5. Compare these sources when they disagree. Prefer current implemented and
   tested behavior over stale planning notes; record meaningful differences and
   deliberate V2 changes in V2 documentation.
6. Do not read or copy secret values from any `.env`, `.env.local`, credential
   file, or runtime configuration. Use only placeholder examples in
   `.env.example`. Never expose server secrets to browser code.
7. Before implementation, produce a concise feature/route/data/security
   checklist from the source. Then continue directly into implementation.

## Required monorepo topology

Use pnpm workspaces and Turborepo. The following app paths and domains are
required; preserve this mapping:

| Workspace | Responsibility | Production domain |
|---|---|---|
| `apps/web` | Public/guest archive, SEO pages, public paper discovery, canonical `/api/v1` backend | `epapers.co.tz` |
| `apps/contributor` | Contributor account, dashboard, submissions, uploads, XP and shared account settings | `contributor.epapers.co.tz` |
| `apps/lecturer` | Lecturer portal, verification state, lecturer paper tools and bulk upload | `lecturer.epapers.co.tz` |
| `apps/admin` | Protected administration console and governance tools | `console.epapers.co.tz` |

Required shared packages:

| Workspace | Responsibility |
|---|---|
| `packages/database` (`@epapers/database`) | Canonical Prisma schema, CockroachDB migrations, generated Prisma client, typed database access, seed and migration scripts |
| `packages/auth` (`@epapers/auth`) | Shared auth types/contracts, token/session verification, server-side RBAC guards, cookie and CSRF/origin policy helpers, and safe client session/context utilities |

Add focused shared packages where they eliminate real duplication, such as
`packages/server` for domain services and API use cases, `packages/ui` for
accessible shared components/tokens, `packages/validation` for safe shared
schemas, and `packages/config` for shared TypeScript/lint/Tailwind configuration.
Do not create empty abstractions or duplicate database/auth logic in apps.

The canonical API lives at `https://epapers.co.tz/api/v1` in `apps/web`; do not
add a fifth app or duplicate route handlers without explicit approval. All
portals use this same API contract. Route handlers in `apps/web` are thin
adapters that call shared server-only services (for example in
`packages/server`) and `@epapers/database`; never copy business rules across
portals. Portal server components may call shared server services directly only
when doing so preserves the same validation, authorization, DTO, and audit
rules as the API. Do not expose privileged package exports to client bundles.

Add a root `package.json`, `pnpm-workspace.yaml`, `turbo.json`, and pinned
`packageManager` field. Use consistent Node/pnpm engines and shared dependency
versions. Each app/package has its own correctly named package manifest and
scripts. Define Turbo task dependencies deliberately: builds depend on
workspace dependency builds and database client generation; lint/typecheck/test
run in the relevant dependency order. Declare task outputs and environment
inputs explicitly so cache hits are correct. Do not cache secrets or
environment-dependent deployment outputs.

The applications deploy independently to their specified domains but share
workspace packages at build time. Document one local development workflow,
per-app dev ports, domain/env configuration, coordinated migrations, and
independent production deployment. Do not imply that pnpm workspace packages
are runtime-shared across machines: each deployed app bundles its required
workspace dependencies.

### Shared authentication across portal subdomains

All four domains are HTTPS subdomains of `epapers.co.tz`. Design one identity,
one session model, and consistent authorization across them:

- Prefer the existing access-token-in-memory + rotating refresh-token pattern
  unless inspection proves the production contract has changed. Never place
  credentials in localStorage or sessionStorage.
- If the refresh cookie must be available to all portals, set a Secure,
  HttpOnly cookie with the narrowest workable shared domain
  (`.epapers.co.tz`), path, expiry, and SameSite policy. Subdomains are
  same-site but cross-origin; configure credentialed CORS with exact trusted
  origins for the deployed portal domains, never `*`.
- Enforce Origin/CSRF protections on every cookie-authenticated mutation;
  validate against an explicit allowlist of portal origins. Do not treat
  SameSite cookies as the only CSRF defense.
- Centralize JWT/session verification and RBAC policy in `@epapers/auth`.
  Export server-only verification/guard entry points separately from
  client-safe types/session context so secrets, Prisma, and privileged helpers
  cannot enter browser bundles.
- The server/database remains authoritative for role, account status, session
  revocation, and lecturer verification. A portal's hostname, client context,
  or hidden navigation is not authorization.
- Keep the canonical sign-in/registration/verification/recovery UI on
  `apps/web` unless current source behavior requires otherwise. Other portals
  link to or redirect unauthenticated users to that flow with a validated
  return URL. Define an explicit post-login redirect allowlist for the four
  trusted HTTPS portal origins; reject arbitrary return URLs and avoid open
  redirects.
- Test cookie scope, refresh rotation, logout/revocation, CORS, CSRF, denied
  cross-origin mutations, and role enforcement across all portal origins.

## Product identity and scope

EPapers is a single-institution (DIT) examination-paper archive, not a
multi-tenant marketplace. The core hierarchy is Department → Program → Module
→ Paper. Preserve the existing brand, terminology, workflows, and permissions.
Do not invent unrelated features or silently remove existing ones.

Implement four coherent portals with clear ownership boundaries:

### `apps/web` — public / guest experience (`epapers.co.tz`)
- Home/discovery, search, filters, recent and popular papers.
- Department, program, module, and paper detail pages.
- View approved PDFs and marking schemes where available; download through
  fresh short-lived signed links.
- About, how-it-works, FAQ, contact, privacy, terms, takedown, module request,
  offline, rate-limit, not-found, and other existing public information states.
- Public visitors can discover/download without being forced to create an
  account, subject to the existing service policy.

### `apps/contributor` — contributor experience (`contributor.epapers.co.tz`)
- Registration, email verification, login, logout, password recovery/reset,
  session management, password change, and profile/settings.
- Dashboard, upload, submission history/status, notifications, achievements,
  XP/level, authenticated leaderboard, and public contributor profile.
- Preserve the upload flow and its actual file-transfer protocol: request an
  upload authorization, upload PDF bytes directly to object storage without
  forwarding the app's auth cookie/token, complete the upload, then submit
  metadata. Show truthful progress, retry/error, scan, and moderation states.
- The server decides lecturer auto-publication and all XP awards; never trust
  client-supplied role, status, XP, owner, or approval state.

### `apps/lecturer` — lecturer experience (`lecturer.epapers.co.tz`)
- Provide a lecturer-specific portal and navigation, backed by the same
  accounts, sessions, users, papers, curriculum, and services as other portals.
- Include lecturer verification application/status, verified lecturer paper
  tools, and bulk upload if present in the existing implementation.
- Enforce lecturer-only operations server-side based on current database role,
  verification, account status, and session; do not duplicate contributor
  business logic or maintain a separate lecturer identity.
- Reuse shared contributor account/profile components where appropriate while
  keeping lecturer workflows and domain-specific navigation distinct.

### `apps/admin` — admin experience (`console.epapers.co.tz`)
- Overview/statistics and operational health.
- Paper review queue and paper directory, including metadata corrections,
  approve/reject/spam, reports/flags, takedowns, restoration, and retention.
- Department/program/module management and module import/request workflows.
- User/account management, lecturer verification, XP ledger/awards where
  supported, announcements, contact inbox, settings/security controls,
  notifications, and immutable audit history.
- Require current server-verified admin authorization. Apply reauthentication
  and reason requirements to sensitive actions as implemented in the source.
- Protect against self-lockout and ensure role/status changes revoke sessions
  according to the existing behavior.

Retain the current route inventory and externally linked URLs wherever practical:

Public — `apps/web`: `/`, `/search`, `/departments`, `/departments/[dept]`,
`/modules/[code]`, `/papers/[id]`, `/recent`, `/popular`, `/how-it-works`,
`/faq`, `/about`, `/contact`, `/privacy`, `/terms`, `/takedown`,
`/request-module`, `/offline`, `/rate-limit`, `/login`, `/register`, `/verify`,
`/forgot-password`, `/reset-password`.

Contributor — `apps/contributor`: `/dashboard`, `/upload`, `/dashboard/submissions`,
`/dashboard/achievements`, `/leaderboard`, `/u/[username]`,
`/dashboard/notifications`, `/dashboard/settings`,
`/dashboard/request-module`, `/help`.

Lecturer — `apps/lecturer`: `/`, `/papers`, `/bulk-upload`,
`/verification`, `/dashboard/settings` (preserve legacy links with deliberate
redirects where paths change; authentication UI may redirect to the canonical
`apps/web` flow).

Admin — `apps/admin`: `/`, `/review`, `/flags`, `/takedowns`,
`/module-requests`, `/papers`, `/structure`,
`/users`, `/lecturers`, `/audit`, `/health`, `/communications`,
`/notifications`, `/settings`.

## Technical architecture

- Use compatible stable Next.js App Router/React versions and strict
  TypeScript across apps/packages. Pin Node and pnpm versions at the root.
- Implement all four Next.js apps as independent workspace projects, sharing
  contracts and server logic through explicit `@epapers/*` package exports.
  Use server components by default for data-backed pages and SEO; use client
  components only for interactive behavior.
- Keep canonical route handlers in `apps/web/app/api/v1/**/route.ts`. They
  validate and authorize, call a shared use case/service, and return a typed
  response. Keep handlers thin and keep domain rules out of UI and app
  projects. All app API calls target the canonical API origin.
- Put auth and RBAC contracts in `packages/auth`; the Prisma schema, generated
  client, migration history, and database utilities in `packages/database`;
  and server-only use cases for auth, users, curriculum/catalogue, papers,
  uploads/storage, moderation, gamification, notifications, admin, settings,
  email, and jobs in a focused shared package such as `packages/server`.
  Services return explicit DTOs, never raw database rows.
- Keep database schema/migrations canonical and singular: only
  `packages/database` owns Prisma schema, migration commands, and seeds. Use
  Prisma with CockroachDB if that remains the source project's active
  contract. Preserve CockroachDB-specific constraints; do not assume vanilla
  PostgreSQL extensions or behavior. Coordinate migration execution once per
  environment, not once per portal deployment.
- Reuse the current S3-compatible Cloudflare R2 integration and object
  lifecycle if configured. Keep storage and email provider credentials
  server-only. Retain queued, retryable email/background work in a worker
  package/process from this repository.
- Preserve `/api/v1` endpoints and response contracts where reasonable so the
  old frontend contract, OpenAPI, and integrations remain understandable.
  Generate/update OpenAPI and document any breaking contract changes.
- Validate environment configuration for each app/process with clear startup
  errors. Provide root and app-specific `.env.example` templates with
  placeholders only; never share real values through workspace manifests or
  browser-exposed `NEXT_PUBLIC_*` variables.
- Root scripts should delegate via Turbo (for example `pnpm dev`,
  `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`). Add targeted
  per-app scripts such as `pnpm --filter @epapers/web dev`; document each
  portal's local port and domain mapping. Build/test only affected workspaces
  where safe, while CI also has a full-monorepo validation path.
- Give the four apps non-conflicting local development ports and configure
  their local API origins, CORS, cookie behavior, and callback URLs explicitly.
  Local settings must not weaken production cookie, CSRF, or origin checks.
- Prefer existing dependencies and established patterns. Do not add heavy
  dependencies, replace the database, create another app framework, or
  duplicate shared functionality without a demonstrated need.

Suggested structure (adapt to Next.js and pnpm conventions; do not create
empty layers):

  package.json                    root scripts, pinned packageManager
  pnpm-workspace.yaml
  turbo.json
  apps/
    web/                           public portal + canonical `/api/v1`
    contributor/                   contributor portal
    lecturer/                      lecturer portal
    admin/                         admin portal
  packages/
    database/                      Prisma schema, migrations, client, seeds
    auth/                          shared auth, JWT/session verification, RBAC
    server/                        server-only domain use cases/services
    ui/                            shared accessible components and tokens
    validation/                    safe shared schemas/contracts if useful
    config/                         shared TS/lint/style config if useful
  worker/                           same-repo background worker if needed
  docs/

Use workspace protocol dependencies (`workspace:*`) for internal packages.
Give every app/package a unique `@epapers/*` package name and explicit
`exports` map. Avoid importing another workspace's `src` files through
relative paths; consume its declared package exports. Mark packages with
server-only dependencies appropriately and split client-safe/server-only
exports.

Never import server-only code, Prisma, secrets, or privileged storage clients
into client components or browser bundles. Use `server-only` boundaries where
appropriate. Each portal may have its own layout/theme/navigation, but shared
components and business logic must have one deliberate source of truth.

## Security, privacy, and correctness requirements

- Use Argon2id (or the already deployed supported password hash) and constant-
  time credential verification where applicable. Do not store plaintext
  passwords, refresh tokens, email codes, or secrets.
- Keep access credentials out of localStorage/sessionStorage. Use secure,
  HTTP-only, appropriately SameSite refresh cookies and rotation/reuse
  detection consistent with the existing API. Coordinate refreshes safely.
- Enforce authorization on every protected server operation, using current DB
  role/status/session state. Deny by default. A hidden button is not auth.
- Validate all bodies, query strings, route IDs, CSV imports, file metadata,
  and environment variables with strict schemas; reject unknown/invalid fields.
- Apply rate limits and CSRF/origin/client checks according to the current
  contract. Do not trust forwarded IP headers except through the configured
  trusted proxy.
- Use parameterized ORM queries; protect against IDOR, mass assignment, account
  enumeration, open redirects, SSRF, unsafe file handling, and leaking private
  user/paper metadata.
- Validate PDF type/content and size on the server/storage completion path.
  Do not accept a filename or browser MIME type as proof of a valid PDF.
- Keep signed URLs short-lived. Do not persist them in the DB, client cache, or
  logs. Never log credentials, codes, tokens, full private payloads, or signed
  URLs. Redact logs explicitly.
- Maintain audit trails for administrator and security-sensitive changes.
  Preserve soft delete, retention, takedown, restoration, and session-revocation
  rules. Avoid destructive migrations and hard deletes unless source policy
  explicitly permits them.
- Handle DB serialization retries/idempotency as appropriate for CockroachDB.
  Use transactions for coupled writes (for example, paper state + review +
  audit + XP/notification effects).
- Do not return demo/fake data on database, mail, or storage failure. Return an
  appropriate error and show the user a clear recoverable message.

## UI/UX quality bar

- Reproduce the existing EPapers visual identity: deep blue `#0049A4`, sidebar
  blue `#00337A`, cyan `#00AEE3`, light blue-gray canvas and white surfaces;
  dark navy admin shell `#0B1B33`. Use Inter for body/interface, Plus Jakarta
  Sans for display, and monospaced tabular numerals for codes and metrics.
- Deliver four distinct responsive shells: frictionless public discovery,
  contributor workspace, lecturer workspace, and information-dense admin
  console.
- Preserve useful desktop navigation and mobile drawer/bottom-navigation
  behavior. Keep focus states, semantic HTML, keyboard operability, reduced
  motion, contrast, accessible labels, and screen-reader feedback.
- Build real loading/skeleton, empty, validation, offline, unauthorized,
  not-found, rate-limited, and service-error states. Avoid dead buttons,
  filler lorem ipsum, fake account switching, mock charts, and placeholder
  successful forms.
- Use the existing logo only after copying it into the V2 project's own
  `public/` directory. Do not rely on the original project path at runtime.

## Implementation order

1. Inventory the existing product and establish the pnpm workspace,
   `turbo.json`, package naming/exports, shared scripts, strict types,
   design tokens, per-app environment validation, error handling, logging,
   canonical database package, and health endpoint.
2. Build and typecheck all four Next.js portal shells, map the requested
   domains/local ports, set up shared UI/auth-safe contracts, and implement
   cross-subdomain cookie/CORS/CSRF configuration.
3. Implement the canonical `apps/web` `/api/v1` handlers and shared
   server-only services backed by `packages/database`; add API contract tests.
4. Implement authentication/session lifecycle and centralized role-aware
   server guards in `packages/auth`. Test session refresh, revocation, CORS,
   CSRF, and role boundaries before protected features depend on them.
5. Implement public catalogue search/detail, PDF upload/storage/download,
   paper ownership, scanning/moderation lifecycle, and contributor workflows.
6. Implement lecturer verification/tools and admin review, curriculum, user,
   governance, communication, audit, and system-health tools in their
   respective portals.
7. Implement notifications, achievements/XP, leaderboard, reporting,
   retention, account export/deletion, and all remaining features from the
   source inventory.
8. Update OpenAPI, monorepo setup, deployment/domain, migration, backup, and
   security documentation. Verify all workspace builds and real feature
   flows; remove temporary scaffolds and mocks.

At each phase, keep the project runnable and type-safe. Do not claim a feature
is complete merely because its page renders.

## Verification and definition of done

- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass through
  Turbo; each app/package can also be built and tested by workspace filter.
- `pnpm install --frozen-lockfile` succeeds from a clean checkout. The lockfile
  is committed, workspace dependency versions are consistent, and Turbo's
  dependency graph correctly builds shared packages before their consumers.
- Add focused tests for auth, permissions, input validation, API response
  contracts, pagination, moderation transitions, upload completion, and
  sensitive admin reauthentication. Add database integration tests only against
  a disposable database whose name clearly identifies it as a test database.
- Exercise the critical end-to-end paths: public search/detail; registration,
  email verification and login; refresh/logout/session revocation; PDF upload,
  completion, moderation and signed download; contributor dashboard; admin
  review and audited sensitive mutation.
- Verify guest access cannot see pending/private papers; contributors cannot
  perform admin mutations; client-supplied roles/owners/statuses are ignored or
  rejected; failures do not become success-shaped responses.
- Test responsive layouts and keyboard interaction for public, contributor,
  lecturer, and admin shells. Verify there are no dead navigation items or
  links to unimplemented pages.
- Verify each app can be independently built/deployed to its required domain
  while sharing the canonical API, database package, auth policy, and contracts.
  The four domains must use HTTPS and the configured credentialed CORS/cookie
  policy. Document deployment env vars and secrets separately per app/process.
- Ensure migrations execute once per environment, not once per app deployment.
  Run the worker (if required) from this repository and document its required
  environment/configuration.
- Do not report unrun tests as passing. In the final report, summarize the
  architecture built, completed features, changed files, validation results,
  and any remaining external setup/blockers.

Begin by inspecting the source project and the current contents of
D:\projects\epapers\EpapersV2. Then implement the complete pnpm/Turborepo
monorepo in that target folder without changing the original projects.
```
