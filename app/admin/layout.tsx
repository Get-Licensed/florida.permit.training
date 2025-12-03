import Link from "next/link";
import { requireAdmin } from "@/utils/requireAdmin";
import AdminNavItem from "./_AdminNavItem";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50 text-[#001f40]">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

          {/* LOGO */}
          <Link href="/admin" className="flex items-center">
            <div className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center shadow-sm">
              <img
                src="/logo.png"
                alt="Florida Permit Training"
                className="h-full w-full object-contain"
              />
            </div>
          </Link>

          {/* NAVIGATION */}
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <AdminNavItem href="/admin/content/slide-manager" label="Slides & Captions" />
            <AdminNavItem href="/admin/content/reorder-modules" label="Modules"/>
            <AdminNavItem href="/admin/content/quiz/new" label="Quizzes"/>
            <AdminNavItem href="/admin/content" label="Outline" />
            <AdminNavItem href="/admin/media" label="Media" />

          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
