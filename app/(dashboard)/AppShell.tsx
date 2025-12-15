// app/(dashboard)/AppShell.tsx
"use client";

import HeaderClient from "./_HeaderClient";
import { supabase } from "@/utils/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();

  /* ───────── AUTO LOGOUT ───────── */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/");
      }, 30 * 60 * 1000);
    };

    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    window.addEventListener("touchstart", reset);
    reset();

    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
      window.removeEventListener("touchstart", reset);
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <main className="flex flex-col bg-white h-[100dvh] overflow-hidden">
      {/* HEADER (fixed height) */}
      <HeaderClient />

      {/* CONTENT (no scrolling) */}
      <section className="flex-1 overflow-hidden">
        {children}
      </section>

      {/* FOOTER / TIMELINE */}
      {footer}
    </main>
  );
}
