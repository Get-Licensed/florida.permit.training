"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

export default function PublicMenuHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  /* === DISABLED NAV ITEMS === */
  const navItems = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "My Course", href: "/course" },
    { name: "My Permit", href: "/my-permit" },
    { name: "My Profile", href: "/profile" },
    { name: "Support", href: "/support" },
  ];

  /* === GOOGLE POPUP LOGIN === */
  const handleLogin = async () => {
    try {
      const redirect = `${window.location.origin}/auth/callback`;

      const res = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirect,
          skipBrowserRedirect: true,
        },
      });

      if (res?.data?.url) {
        window.open(
          res.data.url,
          "GoogleLogin",
          `width=520,height=650,top=${window.screenY + 80},left=${window.screenX + 120}`
        );
        return;
      }

      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirect },
      });
    } catch (err) {
      console.error("Google Login Error:", err);
    }
  };

  /* === CLOSE WHEN CLICKING OUTSIDE === */
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

  /* ======================================================== */
  return (
    <>
      {/* PUBLIC WHITE HEADER – always above progress bar */}
      <header className="flex justify-between items-center p-3 bg-white border-b border-gray-200 relative z-[60]">
        <Link href="/" className="flex items-center">
          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
            <img src="/logo.png" alt="Florida Permit Training" className="h-full w-full object-contain" />
          </div>
        </Link>

        {/* Blue Hamburger */}
        <button
          onClick={() => setMenuOpen(true)}
          className="text-3xl font-bold text-[#001f40]"
        >
          ☰
        </button>
      </header>

      {/* PUBLIC SIDE MENU */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-0 right-0 w-64 h-[100dvh] bg-white text-[#001f40] p-6 shadow-xl z-[70] overflow-y-auto"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-bold text-[#001f40]"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-4 text-lg">
            {navItems.map((item) => (
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

            {/* LOGIN BUTTON */}
            <button
              onClick={handleLogin}
              className="
                mt-6 flex items-center justify-center 
                border border-[#001f40] bg-white text-[#001f40] 
                text-[18px] font-bold px-4 py-2 rounded-md 
                hover:shadow-lg transition-all
              "
            >
              <img
                src="/Google-Icon.png"
                alt="Google Icon"
                className="w-[22px] h-[22px] mr-2"
              />
              Continue with Google
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
