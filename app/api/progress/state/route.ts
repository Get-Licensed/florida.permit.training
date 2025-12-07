// app/api/progress/state/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();

  const user_id = new URL(req.url).searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "Missing user_id" });

  // summary info
  const { data: summary } = await supabase
    .from("course_summary")
    .select("*")
    .eq("user_id", user_id)
    .single();

  // module progress
  const { data: modules } = await supabase
    .from("course_progress_modules")
    .select("*")
    .eq("user_id", user_id);

  // last slide visited by updated_at
  const { data: slideRows } = await supabase
    .from("course_progress_slides")
    .select("module_id, lesson_id, slide_id, slide_index, lesson_index")
    .eq("user_id", user_id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const resume = slideRows?.[0] ?? null;

  return NextResponse.json({
    summary: summary ?? {},
    modules: modules ?? [],
    resume,
  });
}
