import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const { lessonId, slides } = await req.json();

  if (!lessonId || !slides?.length) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const insertRows = slides.map((content: string, i: number) => ({
    lesson_id: lessonId,
    content,
    sort_order: i,
  }));

  const { error } = await supabaseAdmin
    .from("slides")
    .insert(insertRows);

  if (error) {
    console.log("Bulk import error:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
