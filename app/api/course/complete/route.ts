import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user_id = auth.user.id;

  await supabase.from("course_status").upsert(
    {
      user_id,
      course_id: "FL_PERMIT_TRAINING",
      completed_at: new Date().toISOString(),
      status: "completed_unpaid",
    },
    { onConflict: "user_id" }
  );

  return Response.json({ ok: true });
}
