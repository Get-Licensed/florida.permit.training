// utils/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only

  if (!url || !key) {
    console.error("❌ Missing Supabase server env vars");
    throw new Error("Supabase server env vars missing");
  }

  return createClient(url, key);
}
