import { createBrowserClient } from "@supabase/ssr";

// Use the SSR helper so auth sessions are stored in cookies and
// available to server components (e.g., the admin routes).
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
