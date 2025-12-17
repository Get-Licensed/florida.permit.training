// deno-lint-ignore-file
// @ts-nocheck

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { payment_intent } = await req.json();

    if (!payment_intent) {
      return NextResponse.json({ error: "Missing payment_intent" }, { status: 400 } as any);
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("payments")
      .select("status")
      .eq("stripe_payment_intent_id", payment_intent)
      .single();

    if (error || !data) {
      return NextResponse.json({ success: false }, { status: 404 } as any);
    }

    return NextResponse.json({
      success: data.status === "succeeded",
    });
  } catch (err) {
    console.error("PAYMENT VERIFY ERROR:", err);
    return NextResponse.json({ success: false }, { status: 500 } as any);
  }
}
