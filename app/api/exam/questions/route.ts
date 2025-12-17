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
