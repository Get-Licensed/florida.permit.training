// app/api/exam/submit/route.ts

import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function POST(req: NextRequest) {
  const client = supabase;

  // 1) Auth
  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = auth.user.id;

  // 2) Parse JSON
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const answers = body?.answers || {};

  // 3) Load questions
  const { data: questions, error: qErr } = await client
    .from("exam_questions")
    .select("*")
    .order("order_index", { ascending: true });

  if (!questions || qErr) {
    return Response.json(
      { error: "Could not load exam questions" },
      { status: 500 }
    );
  }

  // 4) Score
  let correct = 0;
  for (const q of questions) {
    const given = answers[String(q.id)];
    if (
      given &&
      typeof given === "string" &&
      given.toUpperCase() === q.correct_option.toUpperCase()
    ) {
      correct++;
    }
  }

  const total = questions.length;
  const score = Math.round((correct / total) * 100);
  const passed = score >= 80; // >= 32 correct

  // 5) Insert attempt
  const { error: insertErr } = await client.from("exam_attempts").insert({
    user_id: userId,
    score,
    passed,
    answers,
  });

  if (insertErr) {
    return Response.json(
      { error: "Failed to record exam attempt" },
      { status: 500 }
    );
  }

  // default status
  let finalStatus = "in_progress";

  // 6) If passed -> mark in course_status
  if (passed) {
    const { data: statusRow, error: updErr } = await client
      .from("course_status")
      .update({
        exam_passed: true,
        passed_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("course_id", "FL_PERMIT_TRAINING")
      .select()
      .single();

    if (!statusRow || updErr) {
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
    } else if (timeDone && paid && dmv) {
      finalStatus = "dmv_submitted";
    }
  }

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
}
