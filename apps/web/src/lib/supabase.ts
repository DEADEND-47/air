import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseAuthEnabled = Boolean(supabaseUrl && supabaseAnonKey);

let activeSessionToken: string | null = null;

export const supabase: SupabaseClient | null = isSupabaseAuthEnabled
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;

export function setActiveSession(session: Session | null): void {
  activeSessionToken = session?.access_token ?? null;
}

export function getActiveAccessToken(): string | null {
  return activeSessionToken;
}
