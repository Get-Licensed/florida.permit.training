// app/api/stripe/webhook/route.ts

import Stripe from "stripe";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
  });

// Stripe requires raw body for signature verification in Next route handlers
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

  // -------------------- PAYMENT SUCCEEDED --------------------
if (event.type === "payment_intent.succeeded") {
  const intent = event.data.object as Stripe.PaymentIntent;

  const user_id = intent.metadata?.user_id;
  const course_id = intent.metadata?.course_id ?? "FL_PERMIT_TRAINING";

  if (!user_id) {
    return new Response("Missing user_id metadata", { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

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

  // OPTIONAL: sync payments table (non-authoritative)
  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      completed_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", intent.id);
}

  return new Response("ok", { status: 200 });
}
