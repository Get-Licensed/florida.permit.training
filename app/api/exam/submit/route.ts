import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function POST(req: Request) {
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

  const { answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return Response.json({ error: "Invalid submission" }, { status: 400 });
  }

  // convert to key array
  const questionIds = Object.keys(answers).map((id) => Number(id));

  const { data: questions, error: fetchErr } = await supabase
    .from("exam_questions")
    .select("id, correct_option")
    .in("id", questionIds);

  if (fetchErr) {
    return Response.json(
      { error: "Error validating questions" },
      { status: 500 }
    );
  }

  let correctCount = 0;

  for (const q of questions) {
    const selected = answers[q.id];
    if (selected === q.correct_option) correctCount++;
  }

  const total = questions.length;
  const score = Math.round((correctCount / total) * 100);
  const passed = score >= 80;

  // Update course_status if passed
  if (passed) {
    await supabase
      .from("course_status")
      .update({
        exam_passed: true,
        passed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("course_id", "FL_PERMIT_TRAINING");
  }

  return Response.json({ passed, score });
}
