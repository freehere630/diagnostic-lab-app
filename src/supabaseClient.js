import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly at startup rather than silently constructing an empty
// client that fails every request with an opaque "invalid URL" error.
// This saves hours of debugging on a fresh clone / forgotten .env.
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && "VITE_SUPABASE_URL",
    !supabaseAnonKey && "VITE_SUPABASE_ANON_KEY",
  ].filter(Boolean).join(", ");

  throw new Error(
    `Missing Supabase environment variable(s): ${missing}. ` +
    `Add them to your .env file at the project root and restart the dev server.`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export default supabase