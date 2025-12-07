import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      user_id,
      course_id = "FL_PERMIT_TRAINING",
      module_id,
      slide_index,
      highest_slide_index,
    } = body;

    const supabase = getSupabaseAdmin();

    // increment highest_slide_index when greater
    const { error } = await supabase.from("course_progress_modules").upsert(
      {
        user_id,
        course_id,
        module_id,
        module_index: 0, // optional, not needed for now
        highest_slide_index,
      },
      { onConflict: "user_id,course_id,module_id" }
    );

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
