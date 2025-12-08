"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function run() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error || errorDescription) {
        console.error("Supabase OAuth Error:", error || errorDescription);
        return;
      }

      let session = null;

      // Only try exchange if code exists AND a PKCE verifier exists
      if (code && localStorage.getItem("supabase.auth.token")) {
        const { data, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("PKCE Exchange Error:", exchangeError);
        } else {
          session = data?.session;
        }
      }

      // Fallback: get session if already exchanged
      if (!session) {
        const { data } = await supabase.auth.getSession();
        session = data?.session;
      }

      if (!session) {
        console.error("No session found after callback.");
        return;
      }

      // Upsert profile
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

      // Check admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      const redirectTo = profile?.is_admin ? "/admin" : "/course";

      // Popup → send to opener and close
      if (window.opener) {
        try {
          window.opener.postMessage(
            { type: "authSuccess", redirectTo },
            window.location.origin
          );
        } catch (err) {
          console.warn("Unable to notify opener:", err);
        }
        setTimeout(() => window.close(), 100);
        return;
      }

      // Full page login → direct redirect
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
