# Phases 3–5 API usage

For direct browser upload failures after a successful presign, see [R2 upload CORS setup and verification](R2-UPLOAD-CORS.md).

All paths below are under `/api/v1`. Lists return `{ data: { items, nextCursor } }`; pass the opaque cursor back with the same filters and sort. The default limit is 25 and maximum is 100. Unknown body/query fields are rejected. All mutations require `Origin` equal to `APP_ORIGIN` and `X-EPapers-Client: web`, including public view/download/report requests. Bearer credentials remain required for private endpoints.

## Curriculum and search

`GET /departments`, `/programs?departmentId=UUID&level=BACHELOR`, and `/modules?programId=UUID&semester=1` provide the upload selectors. Modules also accept `departmentId`; all selected ancestors must be active and not deleted. Detail endpoints exist for departments, programs, modules (UUID or case-insensitive code) and papers. Program details contain the first module page; module details contain the first approved paper page.

`GET /papers` accepts `q`, `departmentId`, `programId`, `moduleId`, `category=TEST|UE|SUPP`, `academicYear`, `semester`, `hasMarkingScheme=true|false`, and `sortBy=recent|popular|year_desc|year_asc`. Module code/name search uses normalized prefixes; paper title search is case-insensitive. `/papers/recent` and `/papers/popular` set the corresponding sort. Public data omits email, full name, account status, file keys and XP; handles always reflect the current username. `/users/by-username/{username}` resolves current and reserved historical handles to the canonical username.

Successful public GET metadata uses `public, max-age=60, s-maxage=300`; private endpoints, mutation responses and errors use `no-store`. Cached public metadata can remain visible up to five minutes after moderation. Every new signed URL request independently checks the current database state.

## Upload and download

1. Verified contributors/lecturers call `POST /uploads/presign` with `{ "filename": "exam.pdf", "contentType": "application/pdf", "sizeBytes": 12345 }`. The default maximum is 15 MB and `DAILY_UPLOAD_QUOTA` defaults to 20 reservations per user per UTC day. Lockdown disables presigning, completion and submission.
2. PUT the exact file bytes to `data.uploadUrl` with the returned headers. The server signs content type, content length and `If-None-Match: *` for five minutes. The create-only condition prevents replacing a completed file using an unexpired URL. Browsers set Content-Length from the Blob automatically; application JavaScript must not try to set that forbidden header itself.
3. Call `POST /uploads/{uploadId}/complete` with `{}`. This is owner-only and idempotent. The API checks actual R2 size/type, first bytes and the final EOF marker. Invalid files are marked rejected and deletion is queued durably. Valid files are marked completed and a scan job is queued.
4. Call `POST /papers` with `{ "moduleId": "UUID", "title": "Module UE", "category": "UE", "academicYear": 2024, "semester": 1, "examPeriod": "June", "examUploadId": "UUID", "markingSchemeUploadId": "optional UUID" }`. Files must be completed, owned by the caller and unused, including by retained deleted papers. Semester must match the selected module. Duplicate metadata/hash produces a warning, not rejection. `/papers/duplicate-check` accepts moduleId/category/academicYear/semester for an earlier warning.
5. Contributor and out-of-department/unverified lecturer submissions start pending. A verified lecturer in the module's department starts approved; file access and rewards wait for clean scans. Worker scan failures reject the whole submission. Clean approved files are copied into the private published bucket before `publishedAt` is committed; incoming cleanup is a separate durable job.
6. Public `POST /papers/{id}/download-url` accepts `{ "kind": "exam" }` or `marking_scheme`. Only approved, visible papers with clean published files qualify. Safe names are generated from module code/category/year/semester. GET URLs expire in ten minutes and a bounded per-process LRU reuses them for eight minutes. Each accepted request still appends a download event; views are debounced per IP hash/paper for one minute. The worker commits counter rollups and processed markers together.

Use `GET /users/me/papers` for submission status and reasons. It returns level titles, never XP. Admins can inspect queue/detail routes and use `/admin/papers/{id}/download-url` for a two-minute review URL to a scanned private PDF; review previews do not count as public downloads.

## Moderation and community

Admin `PATCH /admin/papers/{id}/review` accepts `action=approved|rejected|marked_spam|edited`, optional corrected `title`/`moduleId`, and a required reason for rejection/spam. Approval requires every attached PDF to be clean. A single serializable retried transaction records the review, +50 for the paper and +30 for a marking scheme, user totals, achievement progress, notification, audit and durable side-effect intent. Unique reward keys and paper/user locks prevent duplicate grants. Outbox processing queues encrypted emails and file publication after commit. Rejection, spam and takedown never remove earned points or lower levels.

Achievements are seeded as first paper, ten papers and first marking scheme; they expose progress and unlock time without XP. `GET /users/me/achievements`, `GET /notifications`, `PATCH /notifications/{id}` with `{ "read": true }`, and `POST /notifications/read-all` belong only to the current account. Ledger access exists only at admin `GET /admin/users/{id}/xp-ledger`.

`GET /leaderboard?period=week|month|all` requires a contributor, lecturer or admin account. Results contain contributor/lecturer ranks, handles, level titles, XP and approved counts; admins and suspended/banned/deleted accounts are excluded. Periods start Monday 00:00 UTC or the first day of the UTC month. The current implementation aggregates the positive applied ledger directly; Phase 7 load tests can determine whether snapshots are necessary.

`POST /flags` and `/takedowns` require a valid bearer JWT. Module requests validate department/program ownership. Admin queue GETs and item PATCHs exist at `/admin/flags`, `/admin/takedowns`, `/admin/module-requests`. Flag resolutions accept resolved/dismissed and a note. Takedowns accept approved_removed/rejected and a note; removal blocks new downloads without deducting XP. Module request approval creates the module and resolves the request atomically; duplicate module codes return conflict. Takedown requester details appear only in the admin queue.

## Worker and live setup

Run `node --env-file=.env --conditions=react-server --import tsx worker/index.ts` separately from Next.js. It gives OTP jobs priority, claims with optimistic updates and lease tokens, retries failures, scans/hashes PDFs, publishes approved files, dispatches review emails, rolls up counters each minute, cleans abandoned uploads after 24 hours, and verifies XP ledger totals daily. Job completion is guarded by the lease token. External email delivery is at least once; an SMTP acknowledgement failure can cause a repeated message. Soft-delete restore/purge and broader admin tools remain Phase 6 work.

Configure working R2 credentials and two **private** buckets. Keep public bucket access disabled. The incoming bucket's browser CORS needs the exact SPA origin, PUT, and Content-Type/If-None-Match headers. Example bucket CORS configuration:

```json
[{ "AllowedOrigins": ["https://YOUR-SPA-HOST"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type", "If-None-Match"], "ExposeHeaders": ["ETag"], "MaxAgeSeconds": 300 }]
```

Signing follows the [Cloudflare R2 presigned URL documentation](https://developers.cloudflare.com/r2/api/s3/presigned-urls/). Run the read-only bucket probe with `node --env-file=.env --import tsx scripts/probe-r2.ts`. Then verify a real browser PUT, complete, worker scan, admin approval and download using a disposable PDF. Current automated checks use real CockroachDB and mocked storage; live R2 and live email remain manual.

The structural ScanProvider rejects visible JavaScript/Launch/embedded-file names, supports split tokens and hexadecimal escapes, hashes streaming bytes, and estimates pages from visible `/Type /Page` tokens. It is **not an antivirus or complete PDF parser**; compressed/encrypted object streams can evade simple token checks and page counts are approximate. The interface permits a ClamAV adapter later. Signed URLs already issued before rejection/removal can remain usable until expiry (ten minutes public; two minutes review). Each process checks the database before serving cached URLs, so another process's stale LRU cannot authorize a new download.
