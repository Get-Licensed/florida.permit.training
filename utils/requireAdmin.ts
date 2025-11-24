import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabaseServer";

export async function requireAdmin() {
  const supabase = await getServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin, email")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin/not-authorized");

  return profile;
}
