import { createClient } from '@supabase/supabase-js'

// T-004. Supabase client for the task board.
// Env vars come from Vercel, never from code or the repo:
//   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or
//   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// (the names the Supabase-Vercel integration sets).
// Only the publishable / anon key is used. Never a service_role key.
// If the vars are missing at build time, the client is null and the app
// shows an error state instead of a key box — the key is never typed in
// the browser anymore.
const url =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  ''
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

export const supabaseUrl = url
export const supabaseConfigured = Boolean(url && anonKey)
export const supabase = supabaseConfigured ? createClient(url, anonKey) : null
