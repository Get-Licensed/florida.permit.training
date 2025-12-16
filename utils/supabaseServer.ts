// utils/supabaseServer.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import process from "node:process";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // <-- REQUIRED for Deno

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options = {}) {
          try {
            cookieStore.set(name, value, options);
          } catch {
            // ignored (server components)
          }
        },
        remove(name: string, options = {}) {
          try {
            cookieStore.set(name, "", { ...options, maxAge: 0 });
          } catch {
            // ignored
          }
        },
      },
    }
  );
}
