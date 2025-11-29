import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const supabase = getSupabaseAdmin();

  const { lessonId, slides } = await req.json();

  const { error } = await supabase.from("lesson_slides").insert(
    slides.map((s: any, i: number) => ({
      lesson_id: lessonId,
      image_path: s.image_path,
      order_index: i,
      caption_ids: [],
    }))
  );

  if (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
