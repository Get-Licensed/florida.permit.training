"use client";

import HeaderClient from "./_HeaderClient";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState, cloneElement, isValidElement } from "react";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  /* ───────── AUTO LOGOUT ON INACTIVITY ───────── */
  useEffect(() => {
    let timer: any;

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

  /* ───────── GLOBAL COURSE STATE ───────── */
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(1);

  const childWithProps = isValidElement(children)
    ? cloneElement(children as any, {
        audioRef,
        volume,
        setVolume,
      })
    : children;

  /* ───────── SCROLL RULES ───────── */
  const allowScroll =
    pathname.startsWith("/payment") ||
    pathname.startsWith("/finish-pay") ||
    pathname.startsWith("/complete");

  return (
    <main
      className={[
        "flex flex-col bg-white min-h-[100vh]",
        allowScroll ? "" : "md:h-[100dvh] md:overflow-hidden",
      ].join(" ")}
    >
      <HeaderClient volume={volume} setVolume={setVolume} />

      <div
        className={[
          "flex-1 touch-pan-y overscroll-none",
          allowScroll ? "overflow-y-auto" : "md:overflow-y-hidden",
        ].join(" ")}
      >
        {childWithProps}
      </div>
    </main>
  );
}
