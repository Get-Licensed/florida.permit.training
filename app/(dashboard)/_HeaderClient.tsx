// deno-lint-ignore-file no-sloppy-imports
"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

export default function HeaderClient({
  volume,
  setVolume,
}: {
  volume?: number;
  setVolume?: (v: number) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);

  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Course", href: "/course" },
    { name: "My Permit", href: "/my-permit" },
    { name: "My Profile", href: "/profile" },
    { name: "Support", href: "/support" },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
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

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <>
      {/* HEADER */}
      <header className="flex justify-between items-center p-3 bg-white border-b border-gray-200 relative">

        {/* LOGO */}
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

        <div className="flex items-center gap-4">

          {/* FULL NAME */}
          <div className="text-[#001f40] text-sm font-semibold truncate max-w-[200px]">
            {fullName}
          </div>

          {/* VOLUME BAR */}
          {typeof volume === "number" && setVolume && (
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="vol-range w-20 h-1 cursor-pointer appearance-none"
              />
            </div>
          )}

          {/* MENU BUTTON */}
          <button
            onClick={() => setMenuOpen(true)}
            className="text-3xl font-bold text-[#001f40] cursor-pointer"
          >
            ☰
          </button>
        </div>
      </header>

      {/* SIDE MENU */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-0 right-0 w-64 h-[100dvh] bg-white text-[#001f40] p-6 shadow-xl z-50 overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-bold cursor-pointer text-[#001f40]"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-4 text-lg">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`transition-colors duration-200 ${
                  pathname === item.href
                    ? "text-[#ca5608] font-semibold underline"
                    : "text-[#001f40] hover:text-[#ca5608]"
                }`}
              >
                {item.name}
              </Link>
            ))}

            <button
              onClick={handleLogout}
              className="mt-6 text-left text-[#001f40] hover:text-[#ca5608]"
            >
              Log Out
            </button>
          </nav>
        </div>
      )}

      {/* SLIDER STYLES */}
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
    </>
  );
}
