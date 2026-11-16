import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// T-004. Supabase client for the task board.
// Env vars come from Vercel, never from code or the repo:
//   VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or
//   NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
// (the names the Supabase-Vercel integration sets).
// Only the publishable / anon key is used. Never a service_role key.
// If the vars are missing at build time, the client is null and the app
// shows an error state instead of a key box — the key is never typed in
// the browser anymore.

export type Status = 'Todo' | 'Working' | 'Blocked' | 'Ready for Review' | 'Done'
export type Rung = 'DRAFT' | 'INVESTIGATE' | 'AUTOPILOT' | 'FULL AUTOPILOT'

// Ticket categories, approved by Mario 2026-11-17, 17 total. Stored in
// Supabase as public.tickets.category, text, default 'Misc'.
export type Category =
  | 'Product'
  | 'Design'
  | 'Dev'
  | 'Team'
  | 'Skill'
  | 'Social'
  | 'Explore'
  | 'Finance'
  | 'Misc'
  | 'Marketing'
  | 'Sales'
  | 'Research'
  | 'Content'
  | 'Operations'
  | 'Personal'
  | 'Learning'
  | 'Admin'

export const CATEGORIES: Category[] = [
  'Product',
  'Design',
  'Dev',
  'Team',
  'Skill',
  'Social',
  'Explore',
  'Finance',
  'Misc',
  'Marketing',
  'Sales',
  'Research',
  'Content',
  'Operations',
  'Personal',
  'Learning',
  'Admin',
]

export const STATUSES: Status[] = ['Todo', 'Working', 'Blocked', 'Ready for Review', 'Done']
export const RUNGS: Rung[] = ['DRAFT', 'INVESTIGATE', 'AUTOPILOT', 'FULL AUTOPILOT']

export interface Ticket {
  id?: number
  ticket_id: string
  title: string
  owner: string | null
  rung: Rung | string | null
  status: Status
  category: Category | string | null
  block_reason: string | null
  created_at?: string
  updated_at?: string
}

const url =
  import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabaseUrl = url
export const supabaseConfigured = Boolean(url && anonKey)
export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url, anonKey)
  : null
