"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let didRedirect = false;

    const handleSession = async (session: any) => {
      if (didRedirect || !session) return;

      didRedirect = true;
      const user = session.user;

      // Save / update profile
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

      // Get admin role
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

      // Popup handling (Google Sign In via popup)
      if (window.opener) {
        window.opener.postMessage({ type: "authSuccess", session }, "*");
        window.close();
        return;
      }

      // Final Redirect (after upsert + admin check)
      if (profile?.is_admin) {
        router.replace("/admin");
      } else {
        router.replace("/course");
      }
    };

    async function syncSession() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");
      const errorDescription = url.searchParams.get("error_description");

      if (error || errorDescription) {
        console.error("Supabase auth error:", error || errorDescription);
        return;
      }

      if (code) {
        const {
          data: exchangeData,
          error: exchangeError,
        } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Failed to exchange code for session", exchangeError);
          return;
        }

        if (exchangeData?.session) {
          // Handle immediately if a session is included in the exchange response
          await handleSession(exchangeData.session);
          return;
        }
      }

      // Fallback: handle existing session (no SIGNED_IN event fired)
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await handleSession(session);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (didRedirect) return;

        if (event !== "SIGNED_IN" || !session) {
          const {
            data: { session: existingSession },
          } = await supabase.auth.getSession();

          if (!existingSession) return;

          session = existingSession;
        }

        await handleSession(session);
      }
    );

    syncSession();

    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-white">
      <h1 className="text-[#001f40] text-lg font-bold">
        Signing you in, please wait...
      </h1>
    </main>
  );
}
