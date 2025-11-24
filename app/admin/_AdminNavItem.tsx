"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AdminNavItem({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`pb-1 border-b-2 transition-colors ${
        active
          ? "border-[#ca5608] text-[#ca5608]"
          : "border-transparent hover:border-gray-300 hover:text-[#003266]"
      }`}
    >
      {label}
    </Link>
  );
}
