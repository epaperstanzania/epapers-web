# R2 browser upload CORS

Profile images use a five-minute presigned `PUT` URL for the private `profile` bucket. A valid signature does not grant browser CORS permission. The bucket must allow the exact portal origin and the `Content-Type` and `If-None-Match` request headers. Keep the bucket private.

To inspect the existing policy and prepare a merged profile-upload rule without changing R2:

```powershell
node --use-system-ca --env-file=apps/web/.env.local --import tsx packages/server/scripts/configure-profile-cors.ts
```

After reviewing the dry-run result, apply and verify the rule:

```powershell
node --use-system-ca --env-file=apps/web/.env.local --import tsx packages/server/scripts/configure-profile-cors.ts --apply
```

The script preserves unrelated bucket CORS rules. It allows `PUT` from the four Vercel portals, the planned `epapers.co.tz` portals and local development ports 3000/3002/3003/3004. It does not expose R2 credentials or make the bucket public. Run it against the environment whose `R2_PROFILE_BUCKET` points to the live `profile` bucket. If credentials are configured elsewhere, load them through your secret manager rather than copying them into the repository.

Cloudflare may take up to 30 seconds to propagate a policy change. Retry the image upload with a newly generated presigned URL. In browser Network tools, the `OPTIONS` request to R2 should return `Access-Control-Allow-Origin: https://epapertz-contributor.vercel.app` and permit `PUT`, `content-type`, and `if-none-match`. An expired signed URL requires a fresh presign request.

The same CORS rule is needed on the private incoming bucket for PDF uploads. Configure that bucket separately before testing papers.
