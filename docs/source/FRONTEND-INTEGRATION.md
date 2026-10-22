# Frontend integration

The frontend now uses the real backend through `userFrontend/src/services/client.ts` and DTO adapters in `userFrontend/src/services/api.ts`. Demo accounts, role switching, browser mock stores and fake PDF files are removed. See [frontend setup and connection tests](../../userFrontend/API-INTEGRATION.md). The generated [OpenAPI contract](openapi.yaml) remains authoritative. Base URL is your configured API origin plus `/api/v1`. Success is `{ data: ... }`, error is `{ error: { code, message, fields? } }`. Lists return `{ items, nextCursor }`, default 25/max 100; use cursors rather than mock array totals or page numbers. Unknown keys are rejected; remove mock-only fields, ALL filter sentinels, adminUsername and browser-supplied identity.

Keep access JWT in memory. Send `Authorization: Bearer <accessToken>` for authenticated calls and `credentials: 'include'` for login/refresh/logout. Add `Content-Type: application/json` and `X-EPapers-Client: web` to every mutation; browser Origin must equal APP_ORIGIN. Public mutation routes have the same origin rule. On 401, make one serialized refresh request, retry once, then return to sign-in. Do not store JWTs or signed URLs in localStorage, logs or analytics. 403 means forbidden/maintenance/unverified account; 409 means a conflict or unready file; 422 carries validation fields; 429 means rate limiting. Display safe error messages and retry intentionally rather than looping.

| Mock function | API endpoint(s) and adaptation |
|---|---|
| `searchPapers` | `GET /papers`. `query` → `q`, `year` → integer `academicYear`, omit ALL, `hasMarkingScheme` → query string `true`; consume items/nextCursor rather than total. |
| `getAllPapers` | Public `GET /papers`; admin `GET /admin/papers` for pending/other statuses, uppercase status filter. Fetch cursor pages. |
| `getPaper` | `GET /papers/{id}`; record a view separately with `POST /papers/{id}/view`. Missing/hidden returns 404. |
| `recordDownload` | `POST /papers/{id}/download-url` with `{ kind: "exam" }` or `marking_scheme`; use url/expiresAt/filename. The worker updates counters later. There is no immediate authoritative returned count. |
| `getDepartments` | `GET /departments`; public DTO omits mock derived counts. |
| `getDepartment` | `GET /departments/{id}` plus lists `/programs?departmentId=`, `/modules?departmentId=`, `/papers?departmentId=`. UUID only; compose the mock's detail view client-side. |
| `getPrograms` | `GET /programs?departmentId=&level=` with uppercase ORDINARY_DIPLOMA/BACHELOR; campus belongs to each returned program. |
| `getProgram` | `GET /programs/{id}` returns the program with paged modules; request `/papers?programId=` separately. |
| `getModules` | `GET /modules?programId=&departmentId=&semester=`; upload selectors use this after choosing program and semester. Module department comes from its program, not a duplicated module field. |
| `hasDuplicatePaper` | `POST /papers/duplicate-check` with moduleId/category/integer academicYear/semester; authenticated verified uploader; returns duplicateWarning. Warning does not reject upload. |
| `getModule` | `GET /modules/{codeOrId}`, returns module with paged approved papers. Case-insensitive module code is supported. |
| `uploadPaper` | `POST /uploads/presign`, browser PUT each PDF to returned R2 URL, `POST /uploads/{id}/complete`, then `POST /papers` with examUploadId/optional markingSchemeUploadId. Replace mock File URLs/department/module names/XP fields with authoritative UUIDs and supported submission fields. |
| `reviewPaper` | `PATCH /admin/papers/{id}/review` with action approved/rejected/marked_spam/edited, reason, optional title/moduleId. Review DTO returns status/levelTitle; admin identity comes from session. |
| `getLeaderboard` | Authenticated `GET /leaderboard?period=week|month|all`. Rows contain rank/username/levelTitle/xp/approvedCount, not private UserProfile. |
| `getUserProfile` | `GET /users/by-username/{username}` gives public profile only. Use `GET /auth/me` for your private profile. Historical handles resolve safely to the current handle. |
| `updateUserProfile` | `PATCH /users/me` with supported username/fullName/bio/avatarId. Cannot change another user using this call; username collision/cooldown returns 409. |
| `getXpLedger` | Admin-only `GET /admin/users/{id}/xp-ledger`. Remove the ordinary contributor/lecturer ledger page. |
| `getAchievements` | `GET /users/me/achievements`, authenticated owner progress. |
| `getNotifications` | `GET /notifications`; no userId parameter, owner derived from session. |
| `markNotificationRead` | `PATCH /notifications/{id}` with `{ read: true }`, owner-only. |
| `markAllNotificationsRead` | `POST /notifications/read-all` with `{}`; no userId parameter. |
| `getFlags` | `GET /admin/flags`, admin queue. |
| `submitFlag` | `POST /flags` with paperId/reason/details and a valid bearer JWT; omit mock status/reportedAt/username/id. |
| `resolveFlag` | `PATCH /admin/flags/{id}` with status resolved/dismissed and required note. |
| `getTakedowns` | `GET /admin/takedowns`, admin queue. |
| `submitTakedown` | `POST /takedowns` with paperId/requesterFullName/requesterEmail/affiliation/reason/evidence; omit generated fields. |
| `resolveTakedown` | `PATCH /admin/takedowns/{id}` with status approved_removed/rejected and required note. Prior awards remain positive. |
| `getModuleRequests` | `GET /admin/module-requests`, admin queue. |
| `submitModuleRequest` | `POST /module-requests` with departmentId/programId/moduleCode/moduleName/integer academicYear/semester/description. Program and department must match. |
| `resolveModuleRequest` | `PATCH /admin/module-requests/{id}` with status approved/rejected and required note. Approval creates the module when absent. |
| `getAuditLogs` | `GET /admin/audit-logs`, cursor filters actorUserId/action/targetType/targetId. `createdAt` replaces timestamp; audit cannot be edited. |
| `getAdminStats` | `GET /admin/dashboard/stats`; adapt UI to pendingPapers/approvedPapers/users/lecturers/pendingVerifications/flags/takedowns/moduleRequests/downloads. |
| `getAllUsers` | `GET /admin/users` with optional role/status/departmentId/q. Admin user DTO includes authorized identity/XP, no credentials. |
| `manageUser` | Reauthenticated `PATCH /admin/users/{id}`. suspend/ban/reinstate → status SUSPENDED/BANNED/ACTIVE; change_role → role CONTRIBUTOR/LECTURER/ADMIN; verify_lecturer → role LECTURER, homeDepartmentId, lecturerVerified true; adjust_xp → positive `grantXp: {amount,requestId}`. Always reason; negative and zero XP are rejected. Prefer evidence-reviewed verification queue. |
| `createDepartment` | `POST /admin/departments` with code/name/description/icon/isActive/reason. Omit counts/id/adminUsername. |
| `createProgram` | `POST /admin/programs` with departmentId/code/name/level/campus/awardTitle/isActive/reason. |
| `createModule` | `POST /admin/modules` with programId/code/name/semester/optional levelYear/credits/isActive/reason. Omit duplicated departmentId/counts/id. |
| `deleteModule` | Reauthenticated `DELETE /admin/modules/{id}` with reason. Retained papers block deletion: PATCH isActive false to archive instead. |
| `getAnnouncements` | Public `GET /announcements/active`; admin `GET /admin/announcements`. Adapt visibility/UTC startsAt/endsAt and cursor pages. |
| `createAnnouncement` | `POST /admin/announcements` with title/content/type/isActive/startsAt/optional endsAt/reason. |
| `calculateLevel` | Display server levelTitle on ordinary/private/public DTOs. Do not recreate XP/progress bars for private users from hidden XP. Leaderboard/admin views alone receive XP. |
| `normalizeModuleCode` | Optional local display/input helper; server normalizes code lookup. It is not an API call and cannot replace module selection/validation. |

The mock paper uses flat moduleCode/moduleName/program/department fields and uploadedAt. Public paper DTOs nest module/program/department/uploader and use createdAt; flatten explicitly only in your frontend adapter. Academic year is a starting-year integer, e.g. 2024 for 2024/2025. Public paper/profile DTOs have no fullName, email, account status or XP. Private auth/profile DTOs have levelTitle without XP. Module/program detail lists have their own pagination. Public list metadata can lag by 60 seconds/browser or 300 seconds/edge; use private admin reads after writes.

Auth is a separate integration: register → verify-email OTP → login; admin login sends an email code after password verification; `/auth/admin/verify-login` verifies the challenge and code before creating a session. All new registrations are contributors, and role fields are rejected. Auth aliases verify-otp/resend-otp remain available. Forgot/reset, username availability, refresh, logout/logout-all and session list/revoke are in OpenAPI. Before a sensitive admin action, call `POST /auth/reauth` with the password, verify the email code using `POST /auth/reauth/verify`, and attach the returned reauthToken as X-EPapers-Reauth. A role/status/verification change may revoke your target account's sessions, so require sign-in again instead of trusting stale client role state.

Upload instructions: select department → program → semester → module from API UUIDs; only a verified contributor/lecturer can upload. Presign size equals File.size; send the actual File with Content-Type application/pdf and If-None-Match `*`. Browser controls Content-Length; never set it manually. Complete validates storage bytes, and submission can remain pending while scanning/publication finishes. A verified lecturer auto-approves only within their verified department and still awaits clean scan/publication. Check downloadAvailable and handle FILE_NOT_READY. Fetch a fresh signed URL on demand; no public file URL is stored on a paper DTO.

Additional new flows: lecturer verification application/review, curriculum edit/archive, CSV dry-run/commit, settings/readOnly/banner, contact form/inbox, paper soft-delete/restore, announcement edit/delete, account export/delete. Their routes are in [admin guide](ADMIN.md) and OpenAPI. Account export returns independently paged papers/notifications; follow both cursors. Module CSV/import must be previewed before committing. Account deletion requires password; admin accounts need operator-assisted role transfer first.

There is no bulk lecturer-paper upload route, downloadable admin audit export, arbitrary security-secret editing, public XP ledger, mock local admin bypass, automatic hosted backup-trigger job or antivirus adapter. These are not implied by a local mock function; build them as separately scoped work if needed. The mapping above documents the backend contract; implemented frontend setup is described in its API-INTEGRATION.md.
