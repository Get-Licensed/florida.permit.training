import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  const { lessonId, orderedIds } = await req.json();

  for (let i = 0; i < orderedIds.length; i++) {
    await supabase
      .from("lesson_slides")
      .update({ order_index: i })
      .eq("id", orderedIds[i])
      .eq("lesson_id", lessonId);
  }

  return NextResponse.json({ ok: true });
}
