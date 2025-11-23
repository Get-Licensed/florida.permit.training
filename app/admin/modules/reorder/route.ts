import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const updates = await request.json();

  // DO NOT await cookies() in Turbopack
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return cookieStore.get(name)?.value ?? undefined;
        },
        set(name: string, value: string, options: CookieOptions): void {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions): void {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Perform updates in a loop
  for (const u of updates) {
    await supabase
      .from("modules")
      .update({ sort_order: u.sort_order })
      .eq("id", u.id);
  }

  return NextResponse.json({ success: true });
}
