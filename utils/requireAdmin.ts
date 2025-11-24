import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { redirect } from "next/navigation";

export async function requireAdmin() {
  const cookieStore = cookies() as any;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) redirect("/admin/not-authorized");

  return profile;
}
