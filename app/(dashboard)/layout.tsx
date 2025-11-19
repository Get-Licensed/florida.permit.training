"use client";
export const dynamic = "force-dynamic";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { useEffect, useRef, useState } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <main
      className="
        flex flex-col bg-white
        min-h-[100vh]
        md:h-[100dvh]      /* Desktop: lock height */
        md:overflow-hidden /* Prevent scroll on desktop */
      "
    >
      {/* HEADER */}
        <header className="flex justify-between items-center p-3 bg-[#001f40]">
       <Link href="/dashboard" className="flex items-center">
          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
            <img
              src="/logo.png"
              alt="Florida Permit Training"
              className="h-full w-full object-contain"
            />
          </div>
        </Link>

        <button
          onClick={() => setMenuOpen(true)}
          className="text-3xl font-bold text-white cursor-pointer"
        >
          ☰
        </button>
      </header>


      {/* MOBILE-SAFE SIDE MENU */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="
            fixed top-0 right-0 w-64 
            h-[100dvh] 
            bg-[#001f40] text-white p-6 shadow-xl z-50 
            overflow-y-auto
          "
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Menu</h2>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-bold cursor-pointer"
            >
              ✕
            </button>
          </div>

          <nav className="flex flex-col gap-4 text-lg">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`transition-colors duration-200 ${
                    isActive
                      ? "text-[#ca5608] font-semibold underline"
                      : "text-white hover:text-[#ca5608]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="mt-6 text-left text-white hover:text-[#ca5608]"
            >
              Log Out
            </button>
          </nav>
        </div>
      )}

      {/* CONTENT — desktop locked, mobile scrollable */}
      <div
        className="
          flex-1 
          overflow-y-auto 
          md:overflow-y-hidden /* desktop lock */
          touch-pan-y
          overscroll-none
        "
      >
        {children}
      </div>
    </main>
  );
}
