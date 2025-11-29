import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lessonId = searchParams.get("lessonId");

  if (!lessonId) return NextResponse.json([]);

  const { data, error } = await supabaseAdmin
    .from("lesson_slides") // ← FIXED
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (error) {
    console.error("ERROR in GET /admin/slides/list:", error);
    return NextResponse.json([]);
  }

  return NextResponse.json(data || []);
}
