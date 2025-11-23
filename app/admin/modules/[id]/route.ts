import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;

  try {
    const { data, error } = await supabase
      .from("course_modules")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;

  try {
    const { error } = await supabase
      .from("course_modules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
