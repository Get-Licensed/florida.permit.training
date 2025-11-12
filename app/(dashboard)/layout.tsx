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
    router.push("/auth/sign-in");
  };

  // ✅ Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="flex justify-between items-center p-4 text-white bg-[#001f40]">
        <h1 className="text-xl font-bold">
          <Link href="/dashboard" className="hover:text-[#ca5608] transition">
            Florida Permit Training
          </Link>
        </h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-3xl font-bold cursor-pointer"
        >
          ☰
        </button>
      </header>

      {/* Side Menu */}
      {menuOpen && (
        <div
          ref={menuRef}
          className="fixed top-0 right-0 w-64 h-full bg-[#001f40] text-white p-6 shadow-xl z-50 transition-transform duration-300"
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
              className="mt-4 text-left text-white hover:text-[#ca5608] transition-colors"
            >
              Log Out
            </button>
          </nav>
        </div>
      )}

      {/* Page Content */}
      <div className="flex-1">{children}</div>
    </main>
  );
}
