// ============================================================
// Supabase client
//
// 1. Create a free project at https://supabase.com
// 2. Run supabase/schema.sql in the SQL Editor
// 3. Settings > API > copy "Project URL" and "anon public" key
//    into the two constants below
//
// The anon key is meant to be public — Row Level Security (RLS),
// configured in supabase/schema.sql, is what actually protects data.
// ============================================================

const SUPABASE_URL = 'https://hrjccjtudrgicqymvwob.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyamNjanR1ZHJnaWNxeW12d29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MzM4NDQsImV4cCI6MjA5NzEwOTg0NH0.a3NlGvqSet4JjRmaHmj7LWZCme8B0UDBxHGtM7u6tdA';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

Object.assign(window, { sb });
