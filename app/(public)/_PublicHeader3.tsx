"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

export default function PublicMenuHeader({
  volume,
  setVolume,
  audioRef,
}: {
  volume?: number;
  setVolume?: (v: number) => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });
  }, []);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user?.id) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", session.user.id)
        .single();

      if (data?.full_name) setFullName(data.full_name);
    }
    loadProfile();
  }, []);

  const handleLogin = async () => {
    try {
      const redirect = `${window.location.origin}/auth/callback`;
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect },
      });
    } catch {}
  };

  return (
    <div className="relative overflow-visible">
      <Link href="/">
        <img
          src="/logo.png"
          alt="Florida Permit Training"
          className="h-0 w-0 absolute left-3 top-[22px] z-[80]"
          style={{
            filter: `
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
            drop-shadow(0 0 1px white)
          `,
          }}
        />
      </Link>

    <header className="relative h-16 flex items-center bg-white/[0] z-[60]">
  
      <div className="flex items-baseline w-full px-3 gap-4 pl-[100px] justify-end -translate-x-[10px]">
<span
  className="text-white text-sm font-semibold truncate max-w-[200px] cursor-pointer hover:text-[#ca5608]"
  onClick={async () => {
    if (session) return; // already logged in

    const redirect = `${window.location.origin}/auth/callback`;

    const res = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirect, skipBrowserRedirect: true },
    });

    if (res?.data?.url) {
      window.open(
        res.data.url,
        "GoogleLogin",
        `width=520,height=650,top=${window.screenY + 80},left=${window.screenX + 120}`
      );
    }
  }}
>
  {session ? fullName : "Log In"}
</span>

    {typeof volume === "number" && setVolume && (
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="vol-range w-20 h-1 cursor-pointer appearance-none"
      />
    )}
  </div>
</header>
      <style jsx>{`
        .vol-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        .vol-range::-webkit-slider-runnable-track {
          height: 4px;
          background: #001f40;
          border-radius: 2px;
        }
        .vol-range::-moz-range-track {
          height: 4px;
          background: #001f40;
          border-radius: 2px;
        }
        .vol-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #001f40;
          margin-top: -2px;
        }
        .vol-range::-moz-range-thumb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #001f40;
        }
      `}</style>
    </div>
  );
}
