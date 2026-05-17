import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // セッションをlocalStorageに保持
    autoRefreshToken: true,    // トークン自動更新
    detectSessionInUrl: true,  // 招待URLのトークン自動検出
  },
})