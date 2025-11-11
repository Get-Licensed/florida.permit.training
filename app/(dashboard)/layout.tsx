"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ───────────── PROTECT ROUTES ─────────────
  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/sign-in");
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/sign-in");
  };

  // ───────────── LOADING SCREEN ─────────────
  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen bg-white">
        <div className="steering-animation">
          <img
            src="/steering-wheel.png"
            alt="Loading..."
            className="w-20 h-20"
          />
        </div>
      </main>
    );
  }

  // ───────────── PAGE LAYOUT ─────────────
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 text-white bg-[#001f40]">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          Florida Permit Training
        </h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-3xl font-bold cursor-pointer"
        >
          ☰
        </button>
      </header>

      {/* BACKDROP */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMenuOpen(false)}
      />

      {/* SIDE MENU */}
      <div
        className={`fixed top-0 right-0 w-64 h-full bg-[#001f40] text-white p-6 shadow-xl z-50 transform transition-transform duration-300 ${
          menuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
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
        <ul className="flex flex-col gap-4 text-lg">
          <MenuLink label="Dashboard" href="/dashboard" />
          <MenuLink label="My Profile" href="/profile" />
          <MenuLink label="My Course" href="/course" />
          <MenuLink label="My Permit" href="/my-permit" />
          <MenuLink label="Support" href="/support" />
          <MenuLink label="Log Out" href="#" onClick={handleLogout} />
        </ul>
      </div>

      {/* PAGE CONTENT */}
      <section className="flex-1">{children}</section>
    </main>
  );
}

/* ───────────── MENU LINK ───────────── */
function MenuLink({
  label,
  href,
  onClick,
}: {
  label: string;
  href: string;
  onClick?: () => void;
}) {
  const isActive =
    typeof window !== "undefined" && window.location.pathname === href;

  return (
    <li>
      <a
        href={href !== "#" ? href : undefined}
        onClick={onClick}
        className={`cursor-pointer hover:text-[#ca5608] ${
          isActive ? "text-[#ca5608] font-bold underline" : ""
        }`}
      >
        {label}
      </a>
    </li>
  );
}