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

      // Popup handling (Google Sign-In)
      if (window.opener) {
        window.opener.postMessage({ type: "authSuccess", session }, "*");
        window.close();
        return;
      }

      // Final Redirect
      if (profile?.is_admin) {
        router.replace("/admin");
      } else {
        router.replace("/course");
      }
    };

    // Retry logic to allow middleware to refresh cookies first
    const ensureSessionAndRedirect = async (incomingSession: any) => {
      let tries = 0;
      while (tries < 10) {
        const { data: refreshed } = await supabase.auth.getSession();
        if (refreshed?.session) {
          await handleSession(refreshed.session);
          return;
        }
        tries++;
        await new Promise((resolve) => setTimeout(resolve, 150)); // wait 150ms
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

      // Exchange OAuth code if provided
      if (code) {
        const {
          data: exchangeData,
          error: exchangeError,
        } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error("Failed to exchange code for session", exchangeError);
          return;
        }

        // If exchange returned a session immediately, handle it
        if (exchangeData?.session) {
          await ensureSessionAndRedirect(exchangeData.session);
          return;
        }
      }

      // Fallback to existing session after middleware refresh
      const {
        data: { session },
      } = await supabase.auth.getSession();

      await ensureSessionAndRedirect(session);
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

        await ensureSessionAndRedirect(session);
      }
    );

    syncSession();

    return () => listener.subscription.unsubscribe();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-white">
      <h1 className="text-[#001f40] text-lg font-bold">
        Signing you in, please wait…
      </h1>
    </main>
  );
}
