# Administration

All paths use `/api/v1`. Admin access uses the current database role, account status and active session, not a role supplied by the browser. Every write requires the configured `Origin` and `X-EPapers-Client: web`.

Sensitive writes additionally require `X-EPapers-Reauth`, obtained by requesting an email code with `POST /auth/reauth` (password), then verifying it with `POST /auth/reauth/verify` (challengeToken and code). The token lasts five minutes and is bound to that administrator and session. User changes, settings changes, lecturer approval, soft deletion and restoration require it. Roles/status/department/verification changes revoke affected sessions. Self-demotion/suspension is rejected; admin promotion requires verified email. Admin sign-in and sensitive action confirmation use email codes; no authenticator enrollment is required.

| Operation | Endpoint |
|---|---|
| User list/detail/update | `GET /admin/users`, `GET/PATCH /admin/users/{id}` |
| Positive XP awards | User PATCH with `grantXp: { amount, requestId }` and `reason` |
| XP ledger | `GET /admin/users/{id}/xp-ledger` |
| Lecturer application | `POST /lecturer/verifications` with department UUID and evidence |
| Verification queue/review | `GET /admin/lecturer-verifications`, `PATCH /admin/lecturer-verifications/{id}` |
| Curriculum list/create | `GET/POST /admin/departments`, `/admin/programs`, `/admin/modules` |
| Curriculum edit/delete | `PATCH/DELETE /admin/{departments|programs|modules}/{id}` |
| CSV import | `POST /admin/modules/import` |
| Paper removal/restoration | `DELETE /admin/papers/{id}`, `POST /admin/papers/{id}/restore` |
| Settings/security policy | `GET/PATCH /admin/settings`, `GET/PATCH /admin/security` |
| Public maintenance flags | `GET /settings/public` |
| Announcements | `GET/POST /admin/announcements`, `PATCH/DELETE /admin/announcements/{id}` |
| Active public announcements | `GET /announcements/active` |
| Audit/stats | `GET /admin/audit-logs`, `GET /admin/dashboard/stats` |
| Contact inbox | `GET /admin/contact-messages`, `PATCH /admin/contact-messages/{id}` |

PATCH fields are optional; omitted fields are preserved. Every admin mutation requires a nonempty reason. UUIDs come from API responses. Input role/status values are uppercase enums; user DTO role/status values are lowercase. Audit has no edit/delete endpoint. Admin DTOs may expose identity and XP but never password hashes, TOTP secrets or tokens.

XP accepts only positive integers, at most 100,000 per grant. Generate a UUID `requestId` once per intended award and reuse it on retries. Reusing it for a different user, amount or reason returns 409. Suspension, deletion, rejection and takedown preserve prior awards.

CSV request:

```json
{
  "csv": "code,name,programCode,semester,levelYear,credits\nCOE07201,Computer Networks,BENGCOE,1,2,4",
  "dryRun": true,
  "reason": "Approved curriculum import"
}
```

Use an actual active program code from `/admin/programs`; the example code is illustrative. Exact header order is required, with 1–50 rows and a 12,000-character CSV limit. Quoted names, doubled quotes and CRLF are supported. Dry-run returns row errors without inserting modules. Resubmit the same data with `dryRun: false` after validation; commit repeats validation in a serializable transaction and inserts the entire batch or none. Duplicate codes and inactive ancestors are rejected. Ordinary API bodies have a 16 KiB byte limit, including JSON escaping.

Departments/programs/modules with retained dependents cannot be deleted or moved across their hierarchy; use PATCH `isActive: false` to archive them. This hides dependent public listings and new signed downloads. Empty structure rows can be soft-deleted. Paper deletion hides the row immediately, clears cached download entries and retains its objects for `retentionDays` (default 90). Restore requires active curriculum and an unexpired retention window. Once purge starts, restore is blocked even if storage deletion fails; hourly cleanup retries. Purge removes objects and dependent review/event/report rows, preserves audit records and positive ledger entries, and clears their paper foreign key. Existing signed URLs can remain valid until their ten-minute expiry.

Settings allow only `usernameCooldownDays`, `retentionDays`, `lockdown`, `readOnly`, `bannerMessage`. Lockdown blocks registrations and uploads. Read-only blocks ordinary business writes including download/view counters while allowing authentication and admin recovery. Public settings expose only maintenance flags/banner. Announcements appear only while active and inside their UTC start/end window.

Account export uses `GET /users/me/export?limit=25&paperCursor=...&notificationCursor=...`, returning a private profile and independent cursor pages for papers/notifications. Follow both cursors until null. `DELETE /users/me/account` requires the current password. Admin accounts must transfer their role first. Deletion anonymizes the account and linked contact/verification data, revokes sessions and removes challenges/notifications; retained papers, awards, historical handles and audits remain for integrity. Public attribution disappears. Encrypted terminal email payloads are cleared after seven days; workers skip recipients whose account is deleted or inactive.
