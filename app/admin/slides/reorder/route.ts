import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  const { lessonId, orderedIds } = await req.json();

  if (!lessonId || !orderedIds) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Update sort_order for each slide
  const updates = orderedIds.map((id: string, idx: number) =>
    supabaseAdmin.from("slides").update({ sort_order: idx }).eq("id", id)
  );

  await Promise.all(updates);

  return NextResponse.json({ success: true });
}
