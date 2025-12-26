//app\api\payment\verify\route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { payment_intent } = await request.json();

    if (!payment_intent) {
      return NextResponse.json(
        { error: "Missing payment_intent" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("payments")
      .select("status")
      .eq("stripe_payment_intent_id", payment_intent)
      .maybeSingle();

    if (error) {
      console.error("VERIFY QUERY ERROR", error);
      return NextResponse.json(
        { success: false },
        { status: 500 }
      );
    }

    if (data?.status === "succeeded") {
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR", err);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
