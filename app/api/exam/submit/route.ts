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

  // ✅ AUTH (same as questions)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  // ✅ BODY
  const { answers } = await req.json();
  if (!answers || typeof answers !== "object") {
    return Response.json({ error: "Invalid submission" }, { status: 400 });
  }

  // 👉 TODO: grade exam here
  // Example placeholder:
  const passed = true;
  const score = 100;

  // 👉 Update course_status if passed
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
