import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function requireUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.user_metadata?.session_2fa_verified) {
    redirect("/");
  }

  return user;
}
