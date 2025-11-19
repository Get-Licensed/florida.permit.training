import { supabase } from "@/utils/supabaseClient";

export async function requireAuth(router: any) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    router.replace("/");
    return null;
  }

  return data.session.user;
}
