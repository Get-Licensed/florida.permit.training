"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function RefreshAuth() {
  const router = useRouter();

  useEffect(() => {
    async function refresh() {
      try {
        // Force refresh session cookie
        const { data, error } = await supabase.auth.getSession();

        // If there's no session → return to login
        if (error || !data?.session) {
          router.replace("/");
          return;
        }

        // Redirect to admin modules if logged in
        router.replace("/admin/modules");
      } catch (err) {
        console.error("Auth refresh error:", err);
        router.replace("/");
      }
    }

    refresh();
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-white">
      <h1 className="text-[#001f40] text-lg font-bold">
        Preparing your secure session...
      </h1>
    </main>
  );
}
