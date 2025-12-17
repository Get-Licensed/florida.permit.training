import { createSupabaseServerClient } from "@/utils/supabaseServer";

type ExamAnswers = Record<string, string>;

export async function POST(req: Request) {
  try {
    /* ---------- AUTH ---------- */
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

    const userId = user.id;

    /* ---------- BODY ---------- */
    const body = await req.json().catch(() => null);
    const answers: ExamAnswers = body?.answers ?? {};

    /* ---------- LOAD QUESTIONS ---------- */
    const { data: questions, error: qErr } = await supabase
      .from("exam_questions")
      .select("id, correct_option")
      .order("order_index", { ascending: true });

    if (qErr || !questions?.length) {
      return Response.json(
        { error: "Failed to load exam questions" },
        { status: 500 }
      );
    }

    /* ---------- SCORE ---------- */
    let correct = 0;

    for (const q of questions) {
      const given = answers[String(q.id)];
      if (
        given &&
        given.toUpperCase() === q.correct_option.toUpperCase()
      ) {
        correct++;
      }
    }

    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= 80;

    /* ---------- RECORD ATTEMPT ---------- */
    const { error: attemptErr } = await supabase
      .from("exam_attempts")
      .insert({
        user_id: userId,
        score,
        passed,
        answers,
      });

    if (attemptErr) {
      return Response.json(
        { error: "Failed to record exam attempt" },
        { status: 500 }
      );
    }

    /* ---------- UPDATE COURSE STATUS IF PASSED ---------- */
    if (passed) {
      await supabase
        .from("course_status")
        .update({
          exam_passed: true,
          passed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("course_id", "FL_PERMIT_TRAINING")
        .throwOnError();
    }

    return Response.json({
      passed,
      score,
      correct,
      total,
    });
  } catch (err) {
    console.error("EXAM SUBMIT ERROR:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
