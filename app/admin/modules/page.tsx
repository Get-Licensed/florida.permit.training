import { requireAdmin } from "@/utils/requireAdmin";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";
import ModuleList from "./_ModuleList";

export default async function ModulesPage() {
  // Redirects if not admin
  const user = await requireAdmin();

  // ✅ ADMIN client only
  const supabase = getSupabaseAdmin();

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="p-6 bg-white min-h-screen">
      <h1 className="text-2xl font-bold text-[#001f40]">Modules</h1>

      <p className="text-gray-600 mt-2 text-sm">
        Logged in as: {user.email}
      </p>

      <a
        href="/admin/modules/new"
        className="inline-block mt-6 bg-[#001f40] text-white px-4 py-2 rounded-md hover:bg-[#003266]"
      >
        + New Module
      </a>

      <ModuleList initialModules={modules ?? []} />
    </main>
  );
}
