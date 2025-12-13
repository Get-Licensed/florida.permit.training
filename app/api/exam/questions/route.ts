import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  /* -------- AUTH CHECK -------- */
  const { data: auth, error: authError } = await supabase.auth.getUser();

  if (authError || !auth?.user) {
    return Response.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  /* -------- LOAD QUESTIONS -------- */
  const { data, error } = await supabase
    .from("exam_questions")
    .select("id, question, option_a, option_b, option_c")
    .order("order_index", { ascending: true });

  if (error) {
    console.error("Exam questions error:", error);
    return Response.json(
      { error: "Failed to load exam questions" },
      { status: 500 }
    );
  }

  return Response.json({ questions: data });
}
