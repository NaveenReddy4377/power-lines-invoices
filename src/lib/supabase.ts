import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node runtime if not available natively
if (typeof window === 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WebSocket = require('ws');
    globalThis.WebSocket = WebSocket;
  } catch (e) {
    // ignore
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey && supabase);
}
