# EPapers V2

EPapers is the DIT examination-paper archive. V2 migrates the existing application
into four independently deployable Next.js App Router portals. The canonical API,
database, identity, moderation rules, and background jobs remain shared.

| Workspace | Local port | Production origin |
| --- | --- | --- |
| `@epapers/web` | 3000 | `https://epapers.co.tz` |
| `@epapers/contributor` | 3002 | `https://contributor.epapers.co.tz` |
| `@epapers/lecturer` | 3003 | `https://lecturer.epapers.co.tz` |
| `@epapers/admin` | 3004 | `https://console.epapers.co.tz` |

The web application owns `/api/v1`. Other portals call that API; they do not host
copies of its handlers. Public catalogue pages render through the same validated
catalogue services on the server. Protected workflows are interactive client
components whose API requests always recheck the live database identity.

## Local setup

Use Node 24 (the checked version is in `.node-version`) and pnpm 10.33.4:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
```

Copy `apps/web/.env.example` to `apps/web/.env.local` and supply your development
CockroachDB, private R2 buckets, email provider and independent random secrets.
The template values are placeholders, not working credentials. Do not use a
production database for development or tests. The three UI portals have separate
public-only `.env.example` files. Their defaults use the local ports above.

Run database commands from `packages/database` with `DATABASE_URL` supplied by
your shell/secret manager or its local ignored `.env`. Migrate once, then seed:

```sh
pnpm db:migrate
pnpm db:seed
pnpm dev
```

`pnpm dev` starts all four portals through Turbo. To run one:
`pnpm --filter @epapers/contributor dev`. Next loads the app's own environment
file; a root `.env` is not automatically shared across workspaces.

Run the worker separately with its own environment. From `worker`, after creating
an ignored `.env` from its example:

```sh
node --env-file=.env --conditions=react-server --import tsx index.ts
```

With environment variables already injected, `pnpm worker` also works. The worker
delivers queued email, scans PDFs, publishes approved files, rolls up counters,
cleans uploads and enforces retention. Uploads and verification email require it.

## Shared packages

- `database`: the single Prisma schema, unchanged CockroachDB migration history,
  curriculum seeds, generated-client access, soft-delete policy and retry helpers.
- `auth`: server-only JWT/session/RBAC, cookie/origin policy, password hashing;
  separate browser-safe in-memory API/session and credential-flow exports.
- `server`: existing domain services, DTOs, storage, email, rate limits,
  governance, audit, and worker jobs. All consumers use declared package exports.
- `ui`: migrated interactive workflow components, responsive shells, API adapters,
  shared styles and a Next navigation adapter. No React Router or Vite runtime.
- `config`: strict server environment validation, error/password contracts and
  browser-safe portal routing/return-URL configuration.

Each deployment bundles its own required workspace dependencies. Workspace
packages are not services shared across deployed machines.

## Verification

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The production build needs valid server configuration for web because Next loads
route modules during compilation. For a credential-free compilation check only,
`node scripts/verify-build.mjs` supplies conspicuous nonfunctional test values and
runs the same root build. Never deploy those verification artifacts/configuration.

Unit/contract tests mock external services. Database suites run only when
`TEST_DATABASE_URL` names a disposable database containing a `test` name segment.
Apply the canonical migrations to that database before running tests. A normal
`pnpm test` without it reports those integration tests as skipped.

See [deployment and operations](docs/DEPLOYMENT.md),
[security and migration decisions](docs/MIGRATION.md),
[source checklist](docs/IMPLEMENTATION-CHECKLIST.md), and
[OpenAPI](docs/openapi.yaml). Historical source documents in `docs/source` retain
their original descriptions; the V2 migration notes supersede their origin and
repository-path instructions.
