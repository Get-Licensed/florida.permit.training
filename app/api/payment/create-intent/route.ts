import Stripe from "stripe";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    /* ───────── AUTH ───────── */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
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
      .eq("status", "paid")
      .maybeSingle();

    if (paid) {
      return new Response(
        JSON.stringify({ error: "Course already paid" }),
        { status: 409 }
      );
    }

    /* ───────── REUSE EXISTING INTENT ───────── */
    const { data: existing } = await supabase
      .from("payments")
      .select("client_secret")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .eq("status", "requires_payment")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.client_secret) {
      return new Response(
        JSON.stringify({ clientSecret: existing.client_secret }),
        { status: 200 }
      );
    }

    /* ───────── CREATE STRIPE PAYMENT INTENT ───────── */
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        user_id: user.id,
        course_id: courseId,
      },
    });

    /* ───────── STORE IN DB ───────── */
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
      console.error(insertError);
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
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
