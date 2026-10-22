# Deliberate V2 changes and retained contracts

The source projects are read-only inputs. V2 owns its copied logo, code, migration
history and assets and has no runtime dependency on either source directory.

## Routing and rendering

Public routes live on web. `/dashboard/*`, `/upload`, `/leaderboard` and `/help`
redirect to contributor; `/admin/*` redirects to console without the prefix;
`/lecturer/papers` and `/lecturer/bulk-upload` redirect to the faculty host.
Migrated links use one browser-safe portal mapping, and the old console/faculty
prefixes are redirected on those hosts as well. Public contributor profiles also
exist on web so anonymous readers are not forced through a protected layout.

Catalogue pages use server components and cursor pagination over validated shared
services. Interactive workflows use copied components migrated to Next navigation.
The public search form uses GET URLs and supports query/category/year/semester/
marking-scheme/sort filters and curriculum IDs. Department and program pages link
to their descendants. No client-side router mounts an SPA inside Next.

## Authentication and browser boundaries

One exact origin allowlist replaces the old single APP_ORIGIN check. Both CORS and
every mutation check it; mutations also require X-EPapers-Client. A portal hostname
or client role is never an authorization source. `@epapers/auth/server` validates
JWT claims against the current user/session, revocation, account status, database
role and administrator email verification. Sensitive mutations retain a distinct
session-bound reauthentication token and transaction-time checks.

Access tokens remain in memory. Refresh tokens remain hashed in the database and
are rotated with reuse detection. The canonical-origin session iframe serializes
refresh requests using Web Locks across the same-origin iframe contexts, including
requests from other portal origins. Messages check both the exact trusted origin
and the expected source window, with request IDs and timeouts. The parent receives
only the access session DTO; the HttpOnly refresh cookie never enters JavaScript.
Browsers without Web Locks still have in-document deduplication; simultaneous
cross-tab refresh in those older browsers can trigger the existing secure reuse
policy and require a fresh sign-in.

Return URLs are constrained to configured portal origins, reject credentials,
protocol-relative/backslash/control-character inputs and authentication loops.
Server-only entry points are distinct from client-safe auth/config exports.

The original client could deadlock a retried POST by deduplicating its own retry;
V2 retries the underlying request within the existing deduplicated operation.

## Data, workflows and contracts

All original migrations are copied unchanged. No migration is run by this task,
and no hard-delete policy is substituted for soft deletion/retention. Existing
transactional moderation, reward idempotency, scanning, storage publication,
session revocation and audit behavior are preserved.

The existing faculty bulk-upload screen offers a guided individual-upload entry;
it does not implement atomic batch submission. V2 preserves this source behavior.
Faculty auto-publication remains a server decision based on current verified role
and module department, with clean scans required before file availability.

V2 adds a lecturer verification form/history and account session, export and
deletion controls for existing backend capabilities. The only additive API method
is GET `/lecturer/verifications`: authenticated lecturers can list their own
applications with cursor pagination. Other users cannot read those records.
OpenAPI includes the new method and canonical server URLs.

Public metadata and signed-download eligibility use the current catalogue policy.
Reports, takedowns and contact messages retain the implemented authentication
requirements even where older product descriptions implied anonymous forms.
Search indexes are preserved; no new query-plan/performance claim is made.

PDF scanning remains the source structural scanner, not an antivirus or complete
PDF parser. Provider failures are surfaced; no fake data, sample success responses
or generated PDFs are used in application flows.

## Framework references

The implementation follows the official [Next.js App Router installation and
component model](https://nextjs.org/docs/app/getting-started/installation) and
[Turborepo task configuration](https://turborepo.dev/docs/reference/configuration).
The dependency lockfile records the exact resolved versions. Build caching is
disabled for environment-dependent deployable outputs, while typed package/lint
tasks declare their dependency graph.
