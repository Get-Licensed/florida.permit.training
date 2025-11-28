"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminNavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();

  // Exact match
  const isExactMatch = pathname === href;

  // “Editor” gets nested matching except for reorder-modules
  const isEditor =
    href === "/admin/content" &&
    pathname.startsWith("/admin/content") &&
    pathname !== "/admin/content/reorder-modules";

  const active = isExactMatch || isEditor;

  return (
    <Link
      href={href}
      className={`pb-1 border-b-2 transition-colors ${
        active
          ? "border-[#001f40] text-[#001f40]"
          : "border-transparent text-gray-500 hover:text-[#001f40]"
      }`}
    >
      {label}
    </Link>
  );
}
