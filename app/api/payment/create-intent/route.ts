// app/api/payment/create-intent/route.ts

import Stripe from "stripe";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

/* ───────── DEBUG BOOT ───────── */
console.log("CREATE INTENT HIT", {
  stripeKey: !!process.env.STRIPE_SECRET_KEY,
  supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  try {
    /* ───────── PARSE BODY ───────── */
    let body: { user_id?: string };
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "invalid_json" },
        { status: 400 }
      );
    }

    const user_id = body.user_id;
    if (!user_id) {
      return Response.json(
        { error: "missing_user_id" },
        { status: 400 }
      );
    }

    const course_id = "FL_PERMIT_TRAINING";
    const amount_cents = 5995;

    /* ───────── SERVICE ROLE CLIENT (REQUIRED IN PROD) ───────── */
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ───────── BLOCK IF ALREADY PAID ───────── */
    const { data: paid, error: paidErr } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .eq("status", "succeeded")
      .limit(1)
      .maybeSingle();

    if (paidErr) {
      console.error("PAID CHECK ERROR", paidErr);
      return Response.json(
        { error: "payment_check_failed", detail: paidErr.message },
        { status: 500 }
      );
    }

    if (paid) {
      return Response.json(
        { error: "course_already_paid" },
        { status: 409 }
      );
    }

    /* ───────── REUSE OPEN PAYMENT IF POSSIBLE ───────── */
    const { data: existing, error: existingErr } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id, client_secret")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .in("status", ["requires_payment", "requires_confirmation"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) {
      console.error("EXISTING PAYMENT CHECK ERROR", existingErr);
      return Response.json(
        { error: "payment_lookup_failed", detail: existingErr.message },
        { status: 500 }
      );
    }

    if (existing?.stripe_payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(
        existing.stripe_payment_intent_id
      );

      if (
        intent.status === "requires_payment_method" ||
        intent.status === "requires_confirmation"
      ) {
        return Response.json(
          { clientSecret: intent.client_secret },
          { status: 200 }
        );
      }

      // stale → abandon
      await supabase
        .from("payments")
        .update({ status: "abandoned" })
        .eq("stripe_payment_intent_id", intent.id);
    }

    /* ───────── CREATE STRIPE INTENT ───────── */
    const intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id,
        course_id,
      },
    });

    /* ───────── INSERT PAYMENT ROW ───────── */
    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id,
        course_id,
        stripe_payment_intent_id: intent.id,
        amount_cents,
        status: "requires_payment",
        client_secret: intent.client_secret,
      });

    if (insertError) {
      console.error("PAYMENT INSERT ERROR", insertError);
      return Response.json(
        { error: "payment_insert_failed", detail: insertError.message },
        { status: 500 }
      );
    }

    return Response.json(
      { clientSecret: intent.client_secret },
      { status: 200 }
    );
  } catch (err) {
    console.error("CREATE INTENT FATAL ERROR:", err);
    return Response.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
