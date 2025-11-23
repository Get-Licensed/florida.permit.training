"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    let didRedirect = false;

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (didRedirect) return;
        if (event !== "SIGNED_IN" || !session) return;

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

        // Popup handling
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
      }
    );

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
