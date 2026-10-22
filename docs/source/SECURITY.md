# Security and operational boundaries

The API uses pinned HS256 JWT issuer/audience/signature/expiry checks with minimal claims, 15-minute user access tokens and five-minute admin access tokens. Every authenticated call rechecks the session and current database account. Refresh rotation detects family reuse. Refresh cookies are Secure/HttpOnly/SameSite=Lax scoped to `/api/v1/auth`; bearer tokens stay in SPA memory. All writes, including public downloads, require an exact allowed Origin and `X-EPapers-Client: web`.

Passwords use Argon2id; OTP/reset challenges are hashed, expiring and attempt-limited. Admin login/reauth require password plus TOTP; TOTP and email outbox payloads use purpose-bound encryption. Role/status/verification changes revoke sessions. Sensitive admin actions check current role/account/session inside the transaction and require a session-bound five-minute reauth proof. Lecturer verification is department-scoped and requires verified email and an active account/curriculum.

| Capability | Guest | Contributor | Lecturer | Admin |
|---|---|---|---|---|
| Active public curriculum/papers/profile | Yes | Yes | Yes | Yes |
| Signed public download, view | Approved clean published papers only; origin/rate limits apply | Same | Same | Same |
| Submit paper | No | Verified email | Verified email; auto-approval only in verified department | Uploader service rejects admin |
| Leaderboard | No | Yes | Yes | Yes (admin accounts excluded from results) |
| Own profile/papers/notifications/export | No | Own account | Own account | Own account |
| Moderation/ledger/admin CRUD/audit/stats | No | No | No | Yes |
| User/settings/delete/restore/verification review | No | No | No | Reauth required |
| Lecturer verification application | No | No | Unverified eligible lecturer | No |

Suspended/banned/deleted accounts are denied all authenticated endpoints. Owner checks apply to completion, private lists and notification IDs. UUIDs do not replace authorization. List pagination is bounded to 100, body size to 16 KiB, query keys cannot repeat, unknown fields are rejected, CSV rows are bounded to 50, and SQL parameters are bound. Writes retry serialization conflicts at most five times. No XP deduction route exists; positive ledger awards are idempotent and retain their amount through paper/account deletion.

Public DTOs omit identity details, account status, raw file metadata and XP. Leaderboard exposes authorized XP/handle/rank/approved counts. Admin user/ledger views may expose identity/XP, never credentials. API errors hide stack traces, SQL and environment values. Recursive log scrubbing removes credentials, email/name, URLs, secrets, payloads and error messages; request logs are allowlisted. Audit is append-only through API, with scrubbed metadata. Raw clients are limited to restore/purge and isolated test/operator scripts.

Private incoming files are completed against object metadata and PDF start/end bytes; scanning streams a hash and rejects obvious active content before publication. The structural ScanProvider is not antivirus or a full PDF parser. Configure a malware scanner adapter before claiming malware protection. Object access is never public: clean published approved files receive a ten-minute signed URL, cached for eight minutes. Hidden/deleted/archived papers receive no new URL; already-issued links expire naturally. Multiple API processes maintain separate in-memory caches and always check database visibility before responding. Storage failure leaves a paper non-downloadable and its worker job retryable.

Account deletion anonymizes the account/linked contacts/verifications, revokes sessions, removes OTP/reset challenges and notifications, and keeps retained papers/ledger/audits/historical handle reservations. Some voluntarily supplied free text in moderation reports and audit reasons may contain personal information; operators must review retention policy and lawful deletion requests. File ownership and positive award history remain linked to a tombstone UUID. Queued mail is encrypted and workers skip deleted/inactive recipients; terminal mail payloads clear after seven days. Native backups and any exported files need their own retention/access policy.

Lockdown blocks registration/uploads. Read-only blocks business writes but keeps authentication/admin recovery available. Keep maintenance credentials offline, protect DATA_ENCRYPTION_KEY backups separately, rotate revoked credentials deliberately, and revoke session families after suspected exposure. Changing the encryption key without a migration makes existing TOTP/outbox ciphertext unreadable. Read-only does not stop the background worker; stop its service during disaster recovery.

Tests include authorization/reauth matrix, strict PATCH/CSV/positive awards, DTO privacy, nested log redaction, real CockroachDB ownership/moderation/idempotence, purge retry and anonymization. `npm run test:load` measures service search/download with 3,000 fixture papers; it does not measure HTTP/WAF/R2 transfer capacity. `npm run test:restore` exercises a synthetic curriculum logical round-trip; it is not a native backup recovery. Check the result artifacts and [manual checklist](MANUAL.md) before operating publicly.

Report a security issue privately to the deployment owner; do not publish credentials or signed URLs in a public issue. Preserve safe request IDs, revoke affected sessions/keys, switch lockdown/read-only as appropriate, investigate audit/job metadata, patch and test, and restore only into an isolated target. Hosted CI includes dependency audit and gitleaks; local passing checks do not prove a hosted workflow ran.
