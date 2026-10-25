-- EPapers uses its own Node API and Prisma sessions. Supabase Auth provides
-- Google identity only; browser roles must not access application tables
-- through the Supabase Data API.
DO $$
DECLARE
  app_table text;
BEGIN
  FOREACH app_table IN ARRAY ARRAY[
    'departments', 'programs', 'modules', 'users', 'user_sessions',
    'oauth_identities', 'stored_files', 'papers', 'jobs',
    'username_registry', 'admin_auth_challenges', 'auth_challenges',
    'app_settings', 'audit_logs', 'xp_ledger', 'paper_download_events',
    'paper_view_events', 'notifications', 'announcements',
    'module_requests', 'paper_reviews', 'flagged_reports',
    'takedown_requests', 'achievement_definitions',
    'user_achievements', 'contact_messages', 'rate_limit_counters',
    'email_daily_counters', 'lecturer_verifications', '_prisma_migrations'
  ] LOOP
    IF to_regclass(format('public.%I', app_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', app_table);
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated, PUBLIC', app_table);
    END IF;
  END LOOP;
END $$;
