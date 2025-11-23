"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/utils/supabaseClient";
import Link from "next/link";

export default function HeaderClient() {
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
      {/* WHITE HEADER */}
      <header className="flex justify-between items-center p-3 bg-white border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center">
          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
            <img src="/logo.png" alt="Florida Permit Training" className="h-full w-full object-contain" />
          </div>
        </Link>

        {/* Blue Hamburger */}
        <button onClick={() => setMenuOpen(true)} className="text-3xl font-bold text-[#001f40] cursor-pointer">
          ☰
        </button>
      </header>

      {/* WHITE SIDE MENU */}
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
                      : "text-[#001f40] hover:text-[#ca5608]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="mt-6 text-left text-[#001f40] hover:text-[#ca5608]"
            >
              Log Out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
