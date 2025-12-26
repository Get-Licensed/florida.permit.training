// app/api/exam/submit/route.ts

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { deriveCourseStatus } from "@/utils/deriveCourseStatus";

export async function POST(req: Request) {
  /* ───────── AUTH ───────── */
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  /* ───────── PAYLOAD ───────── */
  const { answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return Response.json({ error: "Invalid submission" }, { status: 400 });
  }

  /* ───────── LOAD COURSE STATUS ───────── */
  const { data: existing, error: statusErr } = await supabase
    .from("course_status")
    .select("*")
    .eq("user_id", user.id)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .single();

  if (statusErr || !existing) {
    return Response.json(
      { error: "Course status not found" },
      { status: 400 }
    );
  }

  /* ───────── HARD GATE ───────── */
  if (!existing.completed_at) {
    return Response.json(
      { error: "Course not completed" },
      { status: 403 }
    );
  }

  /* ───────── IDEMPOTENT GUARD ───────── */
  if (existing.exam_passed) {
    return Response.json({ passed: true, score: 100 });
  }

  /* ───────── GRADE EXAM ───────── */
  const questionIds = Object.keys(answers).map(Number);

  const { data: questions, error: fetchErr } = await supabase
    .from("exam_questions")
    .select("id, correct_option")
    .in("id", questionIds);

  if (fetchErr || !questions?.length) {
    return Response.json(
      { error: "Error validating questions" },
      { status: 500 }
    );
  }

  let correctCount = 0;
  for (const q of questions) {
    if (answers[q.id] === q.correct_option) correctCount++;
  }

  const total = questions.length;
  const score = Math.round((correctCount / total) * 100);
  const passed = score >= 80;

  /* ───────── UPDATE STATUS ON PASS ───────── */
  if (passed) {
    const passed_at = new Date().toISOString();

    const status = deriveCourseStatus({
      completed_at: existing.completed_at,
      exam_passed: true,
      paid_at: existing.paid_at,
      total_time_seconds: existing.total_time_seconds ?? 0,
    });

    await supabase
      .from("course_status")
      .update({
        exam_passed: true,
        passed_at,
        status,
      })
      .eq("user_id", user.id)
      .eq("course_id", "FL_PERMIT_TRAINING")
      .throwOnError();
  }

  return Response.json({ passed, score });
}
