// app/api/progress/required-seconds/route.ts
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function GET(req: Request) {
  const supabase = getSupabaseAdmin();
  const slide_id = new URL(req.url).searchParams.get("slide_id");
  if (!slide_id) return new Response("Missing slide_id", { status: 400 });

  const { data, error } = await supabase
    .from("slide_captions")
    .select("seconds")
    .eq("slide_id", slide_id);

  if (error) return new Response(error.message, { status: 500 });

  const required_seconds = data?.reduce((sum, r) => sum + (r.seconds ?? 0), 0) ?? 0;

  return new Response(JSON.stringify({ required_seconds }), {
    headers: { "content-type": "application/json" },
  });
}
