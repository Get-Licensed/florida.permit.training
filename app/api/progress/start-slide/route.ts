// app/api/progress/start-slide/route.ts
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  const {
    user_id,
    module_id,
    lesson_id,
    slide_id,
    slide_index,
  } = body;

  const resp = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });

  const { error } = await supabase
    .from("course_progress_slides")
    .upsert({
      user_id,
      module_id,
      lesson_id,
      slide_id,
      slide_index,
      completed: false,
      started_at: new Date(),
      updated_at: new Date(),
    });

  if (error) return resp({ error: error.message }, 500);

  return resp({ ok: true });
}
