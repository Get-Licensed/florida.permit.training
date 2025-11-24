import { requireAdmin } from "@/utils/requireAdmin";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // enforce admin before rendering
  const profile = await requireAdmin();
  if (!profile?.is_admin) redirect("/admin/not-authorized");

  return (
    <div className="min-h-screen bg-gray-50 text-[#001f40]">
      {/* Top AppBar */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight">Admin Portal</h1>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <AdminNavItem href="/admin/modules" label="Modules" />
            <AdminNavItem href="/admin/users" label="Users" />
            <AdminNavItem href="/admin/settings" label="Settings" />
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}

function AdminNavItem({ href, label }: { href: string; label: string }) {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
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
