import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient(); // MUST await

  // Hard delete for compliance
  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createSupabaseServerClient(); // MUST await

  const { data, error } = await supabase
    .from("modules")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}
