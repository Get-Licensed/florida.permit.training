// app/api/payment/create-intent/route.ts

import Stripe from "stripe";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST() {
  try {
    console.log("CREATE INTENT START");

    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    const supabase = await createSupabaseServerClient();

    /* ───────── AUTH ───────── */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("AUTH USER:", user?.id, authError);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    const courseId = "FL_PERMIT_TRAINING";
    const amountCents = 5995;

    /* ───────── BLOCK IF ALREADY PAID ───────── */
    const { data: paid } = await supabase
      .from("payments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "succeeded")
      .maybeSingle();

    if (paid) {
      return new Response(
        JSON.stringify({ error: "Course already paid" }),
        { status: 409 }
      );
    }

    /* ───────── CREATE PAYMENT INTENT (ONCE) ───────── */
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        course_id: courseId,
      },
    });

    /* ───────── STORE PAYMENT ───────── */
    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        user_id: user.id,
        course_id: courseId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        status: "requires_payment",
        client_secret: paymentIntent.client_secret!,
      });

    if (insertError) {
      console.error("PAYMENT INSERT ERROR:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to store payment" }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
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
