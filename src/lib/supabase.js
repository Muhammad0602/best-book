import { createClient } from '@supabase/supabase-js';

// Both values are public by design: the "anon" key only allows what the
// Row Level Security policies in supabase/schema.sql allow.
// Never put the service_role key here.
const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

const supabase = url && anonKey
  ? createClient(url, anonKey, {
    auth: {
      // PKCE returns "?code=..." instead of "#access_token=...", which
      // would clash with the hash based routes of this app.
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  : null;

export default supabase;
