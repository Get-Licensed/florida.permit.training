import { redirect } from "next/navigation";
import { createClient } from "./supabaseServer";

export async function requireUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.user_metadata?.session_2fa_verified) {
    redirect("/");
  }

  return user;
}
