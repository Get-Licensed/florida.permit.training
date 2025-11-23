import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireAdmin } from "@/utils/requireAdmin";
import ModuleList from "./_ModuleList";

export default async function ModulesPage() {
  const user = await requireAdmin();

  // MUST cast safely like in requireAdmin.ts
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string): string | undefined {
          return cookieStore.get(name)?.value ?? undefined;
        },
        set(name: string, value: string, options: CookieOptions): void {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions): void {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data: modules } = await supabase
    .from("modules")
    .select("*")
    .order("sort_order", { ascending: true });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-[#001f40]">Modules</h1>
      <p className="text-gray-600 mt-2 text-sm">Logged in as: {user.email}</p>

      <a
        href="/admin/modules/new"
        className="inline-block mt-6 bg-[#001f40] text-white px-4 py-2 rounded-md hover:bg-[#003266]">
        + New Module
      </a>

      <ModuleList initialModules={modules ?? []} />
    </main>
  );
}
