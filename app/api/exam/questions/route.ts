import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function GET() {
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

  const { data, error } = await supabase
    .from("exam_questions")
    .select("id, question, option_a, option_b, option_c, correct_option");

  if (error) {
    console.error("Exam questions SQL error:", error);
    return Response.json(
      { error: error.message ?? "Failed to load exam questions" },
      { status: 500 }
    );
  }

  const shuffled = data.sort(() => Math.random() - 0.5);
  const questions = shuffled.slice(0, 40);

  return Response.json({ questions });
}
