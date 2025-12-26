//app\api\course\status\route.ts
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function GET(req: Request) {
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

  const { data, error } = await supabase
    .from("course_status")
    .select(
      "completed_at, exam_passed, paid_at, dmv_submitted_at, status"
    )
    .eq("user_id", user.id)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .maybeSingle();

  // if error and not the "no row found" code, return server error
  if (error && error.code !== "PGRST116") {
    return Response.json(
      { error: "Failed to load course status" },
      { status: 500 }
    );
  }

  // return null when no row exists
  return Response.json(data ?? null);
}
