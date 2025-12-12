"use client";
export const dynamic = "force-dynamic";

import HeaderClient from "./_HeaderClient";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState, ReactElement } from "react";
import { cloneElement, isValidElement } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  /* ───────── AUTO LOGOUT ON INACTIVITY ───────── */
  useEffect(() => {
    let timer: any;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        await supabase.auth.signOut();
        router.replace("/");
      }, 30 * 60 * 1000); // 30 minutes
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

  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);

  const _handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  const childWithProps = isValidElement(children)
    ? cloneElement(children as ReactElement<any>, {
        audioRef,
        volume,
        setVolume,
      } as any)
    : children;

  return (
    <main className="flex flex-col bg-white min-h-[100vh] md:h-[100dvh] md:overflow-hidden">
      <HeaderClient volume={volume} setVolume={setVolume} />
      <div className="flex-1 overflow-y-auto md:overflow-y-hidden touch-pan-y overscroll-none">
        {childWithProps}
      </div>
    </main>
  );
}
