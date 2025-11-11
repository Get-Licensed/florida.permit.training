"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    async function handleAuthRedirect() {
      try {
        // 1️⃣ Get the current Supabase session (Supabase handles parsing the hash)
        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = sessionData?.session;
        if (!session) {
          console.error("No active session found after Google login.");
          router.push("/auth/sign-in");
          return;
        }

        const user = session.user;
        console.log("✅ Logged in as:", user.email);

        // 2️⃣ Ensure user has a profile row
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: user.id,
            full_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split("@")[0],
            email: user.email,
            dob: user.user_metadata?.dob || null,
            pin: user.user_metadata?.pin || "",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );

        if (upsertError) {
          console.error("Profile insert/update failed:", upsertError);
        }

        // 3️⃣ Redirect to dashboard
        router.push("/dashboard");
      } catch (err) {
        console.error("Auth callback error:", err);
        router.push("/auth/sign-in");
      }
    }

    handleAuthRedirect();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-white">
      <h1 className="text-[#001f40] text-lg font-bold">
        Signing you in, please wait...
      </h1>
    </main>
  );
}
