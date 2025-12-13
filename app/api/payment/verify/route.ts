import Stripe from "stripe";
import process from "node:process";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

export async function POST(req: Request) {
  const { payment_intent } = await req.json();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});


  const pi = await stripe.paymentIntents.retrieve(payment_intent);

  if (pi.status !== "succeeded") {
    return Response.json({ success: false });
  }

  const client = await createSupabaseServerClient();

  await client
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("stripe_payment_intent_id", pi.id);

  return Response.json({ success: true });
}
