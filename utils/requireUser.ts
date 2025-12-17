import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function requireUser(accessToken: string) {
  if (!accessToken) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient(accessToken);

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user || !user.user_metadata?.session_2fa_verified) {
    redirect("/");
  }

  return user;
}
