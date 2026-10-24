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

PDF uploads use the separate private `epapers-incoming` bucket. A profile-bucket rule does not apply to it. The live Cloudflare CLI policy is recorded in [`deployment/r2-incoming-cors.json`](../../deployment/r2-incoming-cors.json). When using an authenticated Cloudflare CLI, inspect the bucket's current policy and preserve any rules added since this snapshot:

```powershell
cf r2 buckets cors get epapers-incoming
cf r2 buckets cors update epapers-incoming --rules '@deployment/r2-incoming-cors.json' --dry-run
cf r2 buckets cors update epapers-incoming --rules '@deployment/r2-incoming-cors.json'
cf r2 buckets cors get epapers-incoming
```

`cors update` replaces the bucket's entire rule list, so do not apply a stale snapshot without merging newer rules. The saved file retains the existing `epapers.15botyear.workers.dev` rule and adds exact Vercel, planned custom-domain, and local development origins.

Alternatively, inspect the incoming-bucket policy through the S3 credentials without changing R2:

```powershell
node --use-system-ca --env-file=apps/web/.env.local --import tsx packages/server/scripts/configure-profile-cors.ts --incoming
```

Apply and verify the incoming-bucket rule:

```powershell
node --use-system-ca --env-file=apps/web/.env.local --import tsx packages/server/scripts/configure-profile-cors.ts --incoming --apply
```

These commands require credentials authorized for the live incoming bucket. If they are available only in a secret manager, supply them through that manager instead of copying them into the repository. The script keeps unrelated CORS rules and checks that the saved rule allows `https://epapertz-contributor.vercel.app`, `PUT`, `Content-Type`, and `If-None-Match`. No Vercel redeploy is needed for a bucket CORS change. Request a fresh presigned URL by retrying the upload after the policy propagates.
