import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bgdoudwqamjxlzawqtkl.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnZG91ZHdxYW1qeGx6YXdxdGtsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDc4MTczMywiZXhwIjoyMTA2MzU3NzMzfQ.ELWyHoxDpnGyYQeOW4VylZcH8raUHlkoXujn97jivjc';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // ignore
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options });
        } catch {
          // ignore
        }
      },
    },
  });
}

export function getSupabaseAdminClient() {
  if (!supabaseUrl.startsWith('https://')) return null;
  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: ws },
  });
}

export function cleanInviteCode(raw?: string): string | null {
  if (!raw) return null;
  let code = raw.trim();
  if (code.includes('code=')) {
    const match = code.match(/code=([^&#\s]+)/i);
    if (match) code = decodeURIComponent(match[1]);
  }
  code = code.replace(/^[#?]+/, '').trim();
  if (/^\d+$/.test(code)) {
    code = 'RK-' + code.padStart(3, '0');
  }
  return code.toUpperCase();
}
