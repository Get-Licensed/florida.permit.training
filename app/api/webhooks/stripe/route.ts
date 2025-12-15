// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing stripe-signature", { status: 400 });

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;

    const user_id = intent.metadata?.user_id;
    const course_id = intent.metadata?.course_id ?? "FL_PERMIT_TRAINING";

    if (!user_id) {
      console.error("Missing user_id metadata", intent.id);
      return new Response("Missing metadata", { status: 400 });
    }

    const supabase = await createSupabaseServerClient();

    // 1️⃣ Mark payment succeeded
    await supabase
      .from("payments")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", intent.id);

    // 2️⃣ Mark course paid
    await supabase
      .from("course_status")
      .upsert(
        {
          user_id,
          course_id,
          paid_at: new Date().toISOString(),
        },
        { onConflict: "user_id,course_id" }
      );
  }

  return new Response("ok", { status: 200 });
}
