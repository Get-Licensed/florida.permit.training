import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

    // ✅ Skip Stripe webhooks entirely
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return res;
  }
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // 🔑 REQUIRED — sync auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 🔒 PROTECT COURSE ROUTES
  if (req.nextUrl.pathname.startsWith("/course")) {
    // Not logged in
    if (!user) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Logged in but OTP not completed this session
    if (!user.user_metadata?.session_2fa_verified) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    // Skip static assets
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
