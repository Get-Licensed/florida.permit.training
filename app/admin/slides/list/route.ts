import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(request: Request) {
  const supabase = getSupabaseAdmin();

  const { searchParams } = new URL(request.url);
  const lessonId = searchParams.get("lessonId");

  if (!lessonId) {
    return new Response(
      JSON.stringify({ error: "Missing lessonId" }),
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("lesson_slides")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200 }
  );
}
