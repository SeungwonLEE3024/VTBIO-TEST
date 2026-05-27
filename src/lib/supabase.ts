import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://ojbqkyxnpcahvdeodswm.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'sb_publishable_xeO4hjP1es391v_zaNUHEw_X54jndoB'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
