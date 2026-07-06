// Single source of truth for Supabase connection (AH project).
// Hardcoded because the platform-managed .env keeps reverting to the
// auto-provisioned Lovable Cloud project. The publishable (anon) key is
// safe to commit; RLS is enforced server-side.
export const AH_SUPABASE_URL = "https://eestpryxoabkjfvfqpys.supabase.co";
export const AH_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlc3Rwcnl4b2Fia2pmdmZxcHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MzkwNTksImV4cCI6MjA5NjIxNTA1OX0.074Kubi3ahdW4UJdw_ks-I_dHxhYG1xKxK7YSox1AwY";
export const AH_SUPABASE_PROJECT_ID = "eestpryxoabkjfvfqpys";
