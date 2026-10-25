# Backups and restore exercises

EPapers uses Supabase PostgreSQL for application data and Auth, and private
Cloudflare R2 buckets for PDFs and profile images. Protect and restore the
database and R2 objects separately. A database restore alone cannot recover
an R2 object deleted after its backup. Keep `DATA_ENCRYPTION_KEY`, JWT and
refresh-token secrets in an independent secret backup; database ciphertext
cannot be read without the encryption key.

Check the project's actual backup availability in Supabase Dashboard →
Database → Backups. The retention and point-in-time restore options depend on
the plan and configuration. For an independent logical copy, use the Supabase
CLI `db dump` or a compatible PostgreSQL dump from an authorized environment.
Document who owns the backup, where it is retained, its age, and the recovery
objectives. See the [Supabase database backup guide](https://supabase.com/docs/guides/platform/backups).

For a recovery drill, restore into a separate project without application
traffic. Restore matching R2 object copies, configure isolated application
origins, and keep the worker and outbound email disabled. Compare table counts,
curriculum, papers, files, account state, audit logs, and stored-file object
keys; sample actual downloads and authorization checks. Confirm the Prisma
PostgreSQL baseline and later migrations are recorded as applied. Revoke
restored sessions and challenges before exposing a copy to users, and rotate
signing and refresh secrets if the copy could have been accessed by others.
Record the measured recovery point and recovery time before production cutover.

The old CockroachDB backup procedure applies only to the pre-migration source
database. Keep its snapshot until data import and post-cutover verification
are complete; it is not a Supabase backup.
