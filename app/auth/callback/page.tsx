"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      /* ----------------------------------------------------------
         1. AUTO-ENTER if the session already exists
      ----------------------------------------------------------- */
      const existing = await supabase.auth.getSession();
      const session0 = existing.data?.session;

      if (session0) {
        const { data: profile0 } = await supabase
          .from("profiles")
          .select("is_admin")
          .eq("id", session0.user.id)
          .single();

        const redirectTo = profile0?.is_admin ? "/admin" : "/course";

        // ***** REQUIRED FOR POPUP FLOW *****
        if (window.opener) {
          try {
            window.opener.postMessage(
              { type: "authSuccess", redirectTo },
              window.location.origin
            );
          } catch {}
          setTimeout(() => window.close(), 120);
          return;
        }

        router.replace(redirectTo);
        return;
      }

      /* ----------------------------------------------------------
         2. NORMAL OAUTH PROCESS (if session missing)
      ----------------------------------------------------------- */
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error || errorDescription) {
        console.error("Supabase OAuth Error:", error || errorDescription);
        return;
      }

      let session = null;

      // Try PKCE exchange
      if (code && localStorage.getItem("supabase.auth.token")) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!exchangeError) {
          session = data?.session;
        }
      }

      // fallback
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      }

      if (!session) {
        console.error("No session after callback");
        return;
      }

      /* ----------------------------------------------------------
         3. UPSERT PROFILE
      ----------------------------------------------------------- */
      const user = session.user;
      await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0],
          email: user.email,
          dob: user.user_metadata?.dob ?? null,
          pin: user.user_metadata?.pin ?? "",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      /* ----------------------------------------------------------
         4. CHECK ADMIN FLAG
      ----------------------------------------------------------- */
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      const redirectTo = profile?.is_admin ? "/admin" : "/course";

      /* ----------------------------------------------------------
         5. POPUP PATH (MOST IMPORTANT)
      ----------------------------------------------------------- */
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: "authSuccess", redirectTo },
            window.location.origin
          );
        } catch {}
        setTimeout(() => window.close(), 120);
        return;
      }

      /* ----------------------------------------------------------
         6. NORMAL FULL PAGE
      ----------------------------------------------------------- */
      router.replace(redirectTo);
    }

    run();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-white">
      <h1 className="text-[#001f40] text-lg font-bold">
        Signing you in, please wait…
      </h1>
    </main>
  );
}
