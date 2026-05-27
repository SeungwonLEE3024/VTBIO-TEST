import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ojbqkyxnpcahvdeodswm.supabase.co'
const supabaseAnonKey = 'sb_publishable_xeO4hjP1es391v_zaNUHEw_X54jndoB'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
