import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // 🚫 Skip Stripe webhooks entirely (raw body required)
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

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
          res.cookies.set({
            name,
            value: "",
            ...options,
            maxAge: 0,
          });
        },
      },
    }
  );

  // 🔑 REQUIRED — sync auth session into cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

// 🔒 Protect course routes
if (
  req.nextUrl.pathname.startsWith("/course") ||
  req.nextUrl.pathname.startsWith("/payment")
) {
  if (!user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (!user.user_metadata?.session_2fa_verified) {
    return NextResponse.redirect(new URL("/", req.url));
  }
}

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
