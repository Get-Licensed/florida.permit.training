// app/api/exam/submit/route.ts

import { createSupabaseServerClient } from "@/utils/supabaseServer";

type ExamAnswers = Record<string, string>;

export async function POST(req: Request) {
  try {
    const client = await createSupabaseServerClient();

    /* --------------------------------------------------
       AUTH
    -------------------------------------------------- */
    const { data: auth } = await client.auth.getUser();
    if (!auth?.user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = auth.user.id;

    /* --------------------------------------------------
       PARSE BODY
    -------------------------------------------------- */
    let body: { answers?: ExamAnswers };
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const answers: ExamAnswers = body.answers ?? {};

/* --------------------------------------------------
   LOAD QUESTIONS
-------------------------------------------------- */
const { data: questions, error: qErr } = await client
  .from("exam_questions")
  .select("id, correct_option")
  .order("order_index", { ascending: true });

if (qErr) {
  console.error("EXAM QUESTIONS LOAD ERROR:", qErr);
  return Response.json(
    { error: "Could not load exam questions" },
    { status: 500 }
  );
}

if (!questions || questions.length === 0) {
  return Response.json(
    { error: "No exam questions found" },
    { status: 500 }
  );
}

/* --------------------------------------------------
       SCORE EXAM
    -------------------------------------------------- */
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

    /* --------------------------------------------------
       RECORD ATTEMPT
    -------------------------------------------------- */
    const { error: attemptErr } = await client
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

    /* --------------------------------------------------
       COURSE STATUS
    -------------------------------------------------- */
    let finalStatus = "in_progress";

    if (passed) {
      const { data: statusRow, error: statusErr } = await client
        .from("course_status")
        .update({
          exam_passed: true,
          passed_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .eq("course_id", "FL_PERMIT_TRAINING")
        .select()
        .single();

      if (!statusRow || statusErr) {
        return Response.json(
          { error: "Failed to update course status" },
          { status: 500 }
        );
      }

      const timeDone = !!statusRow.completed_at;
      const paid = !!statusRow.paid_at;
      const dmv = !!statusRow.dmv_submitted_at;

      if (!timeDone) {
        finalStatus = "in_progress";
      } else if (timeDone && !paid) {
        finalStatus = "completed_unpaid";
      } else if (timeDone && paid && !dmv) {
        finalStatus = "completed_paid";
      } else {
        finalStatus = "dmv_submitted";
      }
    }

    /* --------------------------------------------------
       RESPONSE
    -------------------------------------------------- */
    return Response.json(
      {
        passed,
        score,
        correct,
        total,
        status: finalStatus,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("EXAM SUBMIT ERROR:", err);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
