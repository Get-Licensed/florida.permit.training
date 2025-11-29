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

  const active = pathname === href;

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
