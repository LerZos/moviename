import 'server-only';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasRealSupabaseAdminCredentials() {
  const normalizedUrl = supabaseUrl?.trim().toLowerCase() ?? '';
  const normalizedKey = serviceRoleKey?.trim().toLowerCase() ?? '';

  return Boolean(
    normalizedUrl &&
      normalizedKey &&
      !normalizedUrl.includes('127.0.0.1') &&
      !normalizedUrl.includes('localhost') &&
      !normalizedKey.includes('placeholder'),
  );
}

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!serviceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'kinoluma-import-system',
    },
  },
});
