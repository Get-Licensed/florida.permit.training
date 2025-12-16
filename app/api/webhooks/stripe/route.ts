// app/api/webhooks/stripe/route.ts

import Stripe from "stripe";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  /* ───────── STRIPE SIGNATURE ───────── */
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return new Response("Missing stripe-signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 400 });
  }

  /* ───────── ONLY HANDLE SUCCEEDED ───────── */
  if (event.type !== "payment_intent.succeeded") {
    return new Response("Ignored", { status: 200 });
  }

  const intent = event.data.object as Stripe.PaymentIntent;

  const user_id = intent.metadata?.user_id;
  const course_id = intent.metadata?.course_id ?? "FL_PERMIT_TRAINING";

  if (!user_id) {
    console.error("❌ Missing user_id metadata on intent", intent.id);
    return new Response("Missing metadata", { status: 400 });
  }


  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /* ------------------------------------------------------------------
     1️⃣ UPDATE EXISTING PAYMENT ROW (PRIMARY PATH)
     ------------------------------------------------------------------ */
    const { data: updatedRows, error: updateError } = await supabase
      .from("payments")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", intent.id)
      .select("*");

    if (updateError) {
      console.error("❌ Failed to update payment row", updateError);
      return new Response("DB error", { status: 500 });
    }

    const updatedCount = updatedRows?.length ?? 0;

  /* ------------------------------------------------------------------
     1️⃣b FAILSAFE — INSERT IF ROW WAS MISSING (SELF-HEALING)
     ------------------------------------------------------------------ */
  if (updatedCount === 0) {
    console.error(
      "⚠️ Webhook received but no payment row matched. Inserting recovery row.",
      intent.id
    );

    const { error: insertError } = await supabase.from("payments").insert({
      user_id,
      course_id,
      stripe_payment_intent_id: intent.id,
      amount_cents: intent.amount,
      status: "succeeded",
      completed_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("❌ Failed to insert recovery payment row", insertError);
      return new Response("DB error", { status: 500 });
    }
  }

  /* ------------------------------------------------------------------
     2️⃣ ABANDON ALL OTHER OPEN ATTEMPTS
     ------------------------------------------------------------------ */
  const { error: abandonError } = await supabase
    .from("payments")
    .update({ status: "abandoned" })
    .eq("user_id", user_id)
    .eq("course_id", course_id)
    .neq("stripe_payment_intent_id", intent.id)
    .in("status", ["requires_payment", "requires_confirmation"]);

  if (abandonError) {
    console.error("⚠️ Failed to abandon old attempts", abandonError);
    // non-fatal
  }

/* ------------------------------------------------------------------
   3️⃣ MARK COURSE AS PAID (GUARANTEED WRITE)
   ------------------------------------------------------------------ */
const { data: csUpdated, error: csUpdateError } = await supabase
  .from("course_status")
  .update({
    paid_at: new Date().toISOString(),
  })
  .eq("user_id", user_id)
  .eq("course_id", course_id)
  .select("*");

if (csUpdateError) {
  console.error("❌ Failed to update course_status", csUpdateError);
  return new Response("DB error", { status: 500 });
}

if ((csUpdated?.length ?? 0) === 0) {
  const { error: csInsertError } = await supabase
    .from("course_status")
    .insert({
      user_id,
      course_id,
      paid_at: new Date().toISOString(),
    });

  if (csInsertError) {
    console.error("❌ Failed to insert course_status", csInsertError);
    return new Response("DB error", { status: 500 });
  }
}
  return new Response("ok", { status: 200 });
}
