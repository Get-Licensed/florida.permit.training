import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const accessToken = authHeader.replace("Bearer ", "");
  const supabase = createSupabaseServerClient(accessToken);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date().toISOString();

  await supabase
    .from("course_status")
    .upsert(
      {
        user_id: user.id,
        course_id: "FL_PERMIT_TRAINING",
        completed_at: now,
        status: "completed_unpaid",
      },
      { onConflict: "user_id" }
    )
    .throwOnError();

  return Response.json({ ok: true });
}
