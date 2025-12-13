import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  /* -------------------- AUTH -------------------- */
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = auth.user.id;

  /* -------------------- LOAD COURSE STATUS -------------------- */
  const { data: cs, error } = await supabase
    .from("course_status")
    .select(`
      completed_at,
      exam_passed,
      passed_at,
      paid_at,
      dmv_submitted_at
    `)
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .single();

  /* -------------------- NO ROW = NOT STARTED -------------------- */
  if (error || !cs) {
    return Response.json(
      {
        status: "not_started",
        course_complete: false,
        exam_passed: false,
        paid: false,
        dmv_submitted: false,
      },
      { status: 200 }
    );
  }

  /* -------------------- DERIVE STATUS (SOURCE OF TRUTH) -------------------- */
  let status = "in_progress";

  if (cs.completed_at) status = "course_completed";
  if (cs.exam_passed) status = "completed_unpaid";
  if (cs.exam_passed && cs.paid_at) status = "completed_paid";
  if (cs.dmv_submitted_at) status = "dmv_submitted";

  /* -------------------- RESPONSE -------------------- */
  return Response.json(
    {
      status,

      course_complete: Boolean(cs.completed_at),
      exam_passed: Boolean(cs.exam_passed),
      paid: Boolean(cs.paid_at),
      dmv_submitted: Boolean(cs.dmv_submitted_at),

      completed_at: cs.completed_at,
      passed_at: cs.passed_at,
      paid_at: cs.paid_at,
      dmv_submitted_at: cs.dmv_submitted_at,
    },
    { status: 200 }
  );
}
