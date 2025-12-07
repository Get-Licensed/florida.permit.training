// app/api/progress/complete-slide/route.ts
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();
  const body = await req.json();

  const {
    user_id,
    module_id,
    lesson_id: _lesson_id,
    slide_id,
    slide_index,
    required_seconds,
    effective_seconds_increment,
  } = body;

  const resp = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json" },
    });

  const { data: slide, error: slideError } = await supabase
    .from("course_progress_slides")
    .select("*")
    .eq("user_id", user_id)
    .eq("slide_id", slide_id)
    .single();

  if (slideError) return resp({ error: slideError.message }, 500);

  const newSeconds = Math.min(
    (slide?.effective_seconds ?? 0) + (effective_seconds_increment ?? 0),
    required_seconds ?? 0
  );

  const { error: upError } = await supabase
    .from("course_progress_slides")
    .update({
      completed: true,
      completed_at: new Date(),
      effective_seconds: newSeconds,
      updated_at: new Date(),
    })
    .eq("user_id", user_id)
    .eq("slide_id", slide_id);

  if (upError) return resp({ error: upError.message }, 500);

  const { error: modError } = await supabase
    .from("course_progress_modules")
    .upsert({
      user_id,
      module_id,
      module_index: slide_index,
      highest_slide_index: slide_index,
      updated_at: new Date(),
    });

  if (modError) return resp({ error: modError.message }, 500);

  return resp({ ok: true });
}
