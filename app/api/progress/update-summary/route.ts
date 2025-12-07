import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const {
      user_id,
      course_id = "FL_PERMIT_TRAINING",
    } = await req.json();

    const supabase = getSupabaseAdmin();

    // sum all module effective time
    const { data: modRows } = await supabase
      .from("course_progress_modules")
      .select("total_effective_seconds")
      .eq("user_id", user_id)
      .eq("course_id", course_id);

    const total = (modRows ?? []).reduce(
      (a: number, m: any) => a + (m.total_effective_seconds || 0),
      0
    );

    const eligible_for_exam = total >= (6 * 3600); // 6 hrs

    const { error } = await supabase.from("course_summary").upsert(
      {
        user_id,
        course_id,
        total_effective_seconds: total,
        eligible_for_exam,
      },
      { onConflict: "user_id,course_id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true, total, eligible_for_exam });

  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
