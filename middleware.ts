import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // 🚫 Skip Stripe webhooks (raw body required)
  if (req.nextUrl.pathname.startsWith("/api/webhooks")) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  /* ───────────────── CSP (REQUIRED) ───────────────── */
  res.headers.set(
  "Content-Security-Policy",
  [
    "default-src 'self'",

    // Next.js + Stripe scripts
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://m.stripe.network",

    // REQUIRED for Tailwind / inline styles
    "style-src 'self' 'unsafe-inline'",

    // REQUIRED for Next/Image, icons, Stripe
    "img-src 'self' data: blob: https:",

    // REQUIRED for Tailwind fonts
    "font-src 'self' data:",

    // Stripe iframes
    "frame-src https://js.stripe.com https://hooks.stripe.com https://m.stripe.network",

    // Stripe + Supabase APIs
    "connect-src 'self' https://api.stripe.com https://m.stripe.network https://*.supabase.co",
  ].join("; ")
);


  /* ───────────────── Supabase SSR ───────────────── */
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  /* ───────────────── Route Protection ───────────────── */
  if (
    req.nextUrl.pathname.startsWith("/course") ||
    req.nextUrl.pathname.startsWith("/payment")
  ) {
    if (!user || !user.user_metadata?.session_2fa_verified) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
