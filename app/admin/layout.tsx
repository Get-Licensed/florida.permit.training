import { requireAdmin } from "@/utils/requireAdmin";
import AdminNavItem from "./_AdminNavItem";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This will redirect automatically if user is not admin or not logged in
  await requireAdmin();

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
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
