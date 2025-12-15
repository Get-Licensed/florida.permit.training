// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
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
      console.error("Missing user_id metadata", intent.id, intent.metadata);
      return new Response("Missing user_id metadata", { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const now = new Date().toISOString();

    // ✅ AUTHORITATIVE: mark course as paid
    await supabase
      .from("course_status")
      .upsert(
        {
          user_id,
          course_id,
          paid_at: now,
          status: "completed_paid",
        },
        { onConflict: "user_id,course_id" }
      );

    // ℹ️ STRIPE AUDIT ONLY
    await supabase
      .from("payments")
      .update({
        status: "succeeded",
        completed_at: now,
      })
      .eq("stripe_payment_intent_id", intent.id);
  }

  return new Response("ok", { status: 200 });
}
