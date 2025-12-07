// app/api/progress/state/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();

  const user_id = new URL(req.url).searchParams.get("user_id");
  if (!user_id) return NextResponse.json({ error: "Missing user_id" });

  // summary includes total time & flags
  const { data: summary, error: summaryError } = await supabase
    .from("course_summary")
    .select("*")
    .eq("user_id", user_id)
    .single();

  // modules include completion and order
  const { data: modules, error: modError } = await supabase
    .from("course_progress_modules")
    .select("*")
    .eq("user_id", user_id);

  return NextResponse.json({
    summary: summary ?? {},
    modules: modules ?? [],
  });
}
