import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "./supabaseServer";

export async function requireAdmin() {
  const supabase = await createSupabaseServerClient(); // MUST await

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user;
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin/not-authorized");

  return { id: user.id, email: user.email! };
}
