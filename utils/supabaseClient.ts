// utils/supabaseClient.ts

import { createBrowserClient } from "@supabase/ssr";

// Use the SSR helper so auth sessions sync via cookies and
// can be read by both client and server components.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
