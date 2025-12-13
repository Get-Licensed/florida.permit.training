import Stripe from "stripe";
import { headers } from "next/headers";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get("stripe-signature");

  if (!sig) {
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook verification failed", err);
    return new Response("Webhook Error", { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        completed_at: new Date().toISOString(),
      })
      .eq("stripe_payment_intent_id", intent.id);

    if (error) {
      console.error("Failed to update payment", error);
      return new Response("DB update failed", { status: 500 });
    }
  }

  return new Response("ok");
}
