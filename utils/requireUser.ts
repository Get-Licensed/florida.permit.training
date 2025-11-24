import { redirect } from "next/navigation";
import { getServerSupabase } from "./supabaseServer";

export async function requireUser() {
  const supabase = await getServerSupabase(); // FIX: add await

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  return user;
}
