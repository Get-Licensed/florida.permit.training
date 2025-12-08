"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

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
      <Link href="/dashboard">
        <img
          src="/logo.png"
          alt="Florida Permit Training"
          className="h-20 w-20 absolute left-3 top-[14px] z-[80]"
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

      <header className="flex justify-end items-center pr-3 pl-[100px] py-3 bg-white border-b border-gray-200 relative z-[60]">
  
  <div className="flex items-center gap-4 mr-4">
    <span className="text-[#001f40] text-sm font-semibold truncate max-w-[200px]">
      {fullName}
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

  <button
    type="button"
    onClick={() => setMenuOpen(true)}
    className="text-3xl font-bold text-[#001f40]"
  >
    ☰
  </button>
</header>


      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-0 right-0 w-64 h-[100dvh] bg-white text-[#001f40] p-6 shadow-xl z-[70] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-bold text-[#001f40]"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-4 text-lg">
            {[
              { name: "Dashboard", href: "/dashboard" },
              { name: "My Course", href: "/course" },
              { name: "My Permit", href: "/my-permit" },
              { name: "My Profile", href: "/profile" },
              { name: "Support", href: "/support" },
            ].map((item) => (
              <span
                key={item.name}
                className={`transition-colors duration-200 select-none cursor-not-allowed
              ${
                pathname === item.href
                  ? "text-[#001f40] font-semibold underline"
                  : "text-gray-400"
              }
            `}
              >
                {item.name}
              </span>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-6 flex items-center justify-center border border-[#001f40] bg-white text-[#001f40] text-[18px] font-bold px-4 py-2 rounded-md hover:shadow-lg transition-all"
          >
            <img
              src="/Google-Icon.png"
              alt="Google Icon"
              className="w-[22px] h-[22px] mr-2"
            />
            Continue with Google
          </button>
        </div>
      )}

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
