// app/api/payment/create-intent/route.ts

import Stripe from "stripe";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    /* ───────── AUTH ───────── */
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    const course_id = "FL_PERMIT_TRAINING";
    const amount_cents = 5995;

    /* ───────── BLOCK IF ALREADY PAID ───────── */
    const { data: paid } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .eq("status", "succeeded")
      .limit(1)
      .maybeSingle();

    if (paid) {
      return new Response(
        JSON.stringify({ error: "Course already paid" }),
        { status: 409 }
      );
    }

    /* ───────── CHECK FOR VALID OPEN PAYMENT ───────── */
    const { data: existing } = await supabase
      .from("payments")
      .select("stripe_payment_intent_id, client_secret")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .in("status", ["requires_payment", "requires_confirmation"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Verify with Stripe that it is still usable
      const intent = await stripe.paymentIntents.retrieve(
        existing.stripe_payment_intent_id
      );

      if (
        intent.status === "requires_payment_method" ||
        intent.status === "requires_confirmation"
      ) {
        return new Response(
          JSON.stringify({ clientSecret: intent.client_secret }),
          { status: 200 }
        );
      }

      // Otherwise mark it abandoned
      await supabase
        .from("payments")
        .update({ status: "abandoned" })
        .eq("stripe_payment_intent_id", intent.id);
    }

    /* ───────── CREATE NEW INTENT ───────── */
    const intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        course_id,
      },
    });

    /* ───────── INSERT (DB ENFORCES UNIQUENESS) ───────── */
    const { error: insertError } = await supabase.from("payments").insert({
      user_id: user.id,
      course_id,
      stripe_payment_intent_id: intent.id,
      amount_cents,
      status: "requires_payment",
      client_secret: intent.client_secret!,
    });

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ clientSecret: intent.client_secret }),
      { status: 200 }
    );
  } catch (err) {
    console.error("CREATE INTENT ERROR:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
