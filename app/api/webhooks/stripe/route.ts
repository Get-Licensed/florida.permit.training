// app/api/webhooks/stripe/route.ts

import Stripe from "stripe";
import process from "node:process";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";
import { deriveCourseStatus } from "@/utils/deriveCourseStatus";


export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: Request) {
  console.log("🔥 STRIPE WEBHOOK HIT", new Date().toISOString());
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

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  /* ───────── PAYMENTS (IDEMPOTENT) ───────── */
  await supabase
    .from("payments")
    .upsert(
      {
        user_id,
        course_id,
        stripe_payment_intent_id: intent.id,
        amount_cents: intent.amount,
        status: "succeeded",
        completed_at: now,
      },
      { onConflict: "stripe_payment_intent_id" }
    )
    .throwOnError();

  await supabase
    .from("payments")
    .update({ status: "abandoned" })
    .eq("user_id", user_id)
    .eq("course_id", course_id)
    .neq("stripe_payment_intent_id", intent.id)
    .in("status", ["requires_payment", "requires_confirmation"])
    .throwOnError();


const { data: existing } = await supabase
  .from("course_status")
  .select("*")
  .eq("user_id", user_id)
  .eq("course_id", course_id)
  .maybeSingle();

const updated = {
  user_id,
  course_id,
  paid_at: now,
  completed_at: existing?.completed_at ?? null,
  exam_passed: existing?.exam_passed ?? false,
  passed_at: existing?.passed_at ?? null,
  total_time_seconds: existing?.total_time_seconds ?? 0,
};

const status = deriveCourseStatus(updated);

await supabase
  .from("course_status")
  .upsert(
    { ...updated, status },
    { onConflict: "user_id, course_id" }
  )
  .throwOnError();

  
    return new Response("ok", { status: 200 });
}
