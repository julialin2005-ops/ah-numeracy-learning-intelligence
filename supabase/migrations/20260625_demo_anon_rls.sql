-- Allow anonymous (unauthenticated) users to read from tables needed for the
-- capstone demo. The app runs in demo mode with no auth session; these policies
-- mirror the permissive access already in place for other demo-mode tables.

-- sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_sessions" ON sessions;
CREATE POLICY "anon_read_sessions" ON sessions
  FOR SELECT TO anon USING (true);

-- session_analysis
ALTER TABLE session_analysis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_session_analysis" ON session_analysis;
CREATE POLICY "anon_read_session_analysis" ON session_analysis
  FOR SELECT TO anon USING (true);

-- annotations
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_read_annotations" ON annotations;
CREATE POLICY "anon_read_annotations" ON annotations
  FOR SELECT TO anon USING (true);
