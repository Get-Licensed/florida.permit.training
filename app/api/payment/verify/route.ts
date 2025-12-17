import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(request: Request) {
  try {
    const { payment_intent } = await request.json();

    if (!payment_intent) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing payment_intent" }),
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    /* ───────── VERIFY PAYMENT ───────── */
    const { data, error } = await supabase
      .from("payments")
      .select("status")
      .eq("stripe_payment_intent_id", payment_intent)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ success: data.status === "succeeded" }),
      { status: 200 }
    );
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);

    return new Response(
      JSON.stringify({ success: false }),
      { status: 500 }
    );
  }
}
