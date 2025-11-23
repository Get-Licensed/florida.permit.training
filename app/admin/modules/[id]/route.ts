import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";

// GET module by ID
export async function GET(request: NextRequest, context: any) {
  const id = context.params.id;

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

// DELETE module by ID
export async function DELETE(request: NextRequest, context: any) {
  const id = context.params.id;

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
