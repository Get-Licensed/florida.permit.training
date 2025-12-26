// app/api/course/complete/route.ts

import { createSupabaseServerClient } from "@/utils/supabaseServer";
import { deriveCourseStatus } from "@/utils/deriveCourseStatus";

export async function POST(req: Request) {
  /* ───────── AUTH ───────── */
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

  const course_id = "FL_PERMIT_TRAINING";
  const now = new Date().toISOString();

  /* ───────── LOAD EXISTING ROW ───────── */
  const { data: existing, error } = await supabase
    .from("course_status")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .maybeSingle();

  if (error) {
    return Response.json(
      { error: "Failed to load course status" },
      { status: 500 }
    );
  }

  /* ───────── IDEMPOTENT GUARD ───────── */
  if (existing?.completed_at) {
    return Response.json({ ok: true, alreadyCompleted: true });
  }

  /* ───────── RECOMPUTE STATUS (CRITICAL) ───────── */
  const updated = {
    completed_at: now,
    exam_passed: existing?.exam_passed ?? false,
    paid_at: existing?.paid_at ?? null,
    total_time_seconds: existing?.total_time_seconds ?? 0,
  };

  const status = deriveCourseStatus(updated);

  /* ───────── UPDATE (NOT UPSERT) ───────── */
  await supabase
    .from("course_status")
    .update({
      completed_at: now,
      status,
    })
    .eq("user_id", user.id)
    .eq("course_id", course_id)
    .throwOnError();

  return Response.json({ ok: true });
}
