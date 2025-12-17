import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

/* -------------------------------------------------
   GET module by ID (ADMIN)
------------------------------------------------- */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from("course_modules")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 404 }
      );
    }

    return new Response(JSON.stringify(data), { status: 200 });
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to load module" }),
      { status: 500 }
    );
  }
}

/* -------------------------------------------------
   DELETE module by ID (ADMIN)
------------------------------------------------- */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase
      .from("course_modules")
      .delete()
      .eq("id", params.id);

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Failed to delete module" }),
      { status: 500 }
    );
  }
}
