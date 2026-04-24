import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

let _admin: SupabaseClient | null = null;

/**
 * Service-role client — server only. RLS is bypassed; all authorization is
 * enforced in our Server Actions (session + host checks).
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) {
    return _admin;
  }
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();
  _admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}
