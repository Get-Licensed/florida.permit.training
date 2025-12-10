// app/api/webhooks/stripe/route.ts

import { NextRequest } from "next/server";
import process from "node:process";
import Stripe from "stripe";
import { supabase } from "@/utils/supabaseClient";

// EMAIL (RESEND)
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  const stripe = new Stripe(secret, {
    // @ts-ignore: allow installed version
    apiVersion: undefined,
  });

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error("Webhook error");
    return new Response(`Webhook error: ${e.message}`, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const client = supabase;
    const pi = event.data.object as Stripe.PaymentIntent;

    const userId = pi.metadata?.user_id;
    const courseId = pi.metadata?.course_id;

    // update payments
    await client
      .from("payments")
      .update({ status: "succeeded" })
      .eq("stripe_payment_intent_id", pi.id);

    // update course_status: paid_at
    const now = new Date().toISOString();
    await client
      .from("course_status")
      .update({ paid_at: now })
      .eq("user_id", userId)
      .eq("course_id", courseId);

    // ---------------------
    // SEND NOTIFICATION EMAIL
    // ---------------------
    try {
      await resend.emails.send({
        from: "Florida Permit Training <support@florida.permit.training>",
        to: "amrigeethan@gmail.com",
        subject: "Payment Received",
        html: `
          <p>A user just completed payment.</p>
          <p>User ID: ${userId}</p>
          <p>Course: ${courseId}</p>
          <p>PaymentIntent: ${pi.id}</p>
        `,
      });
    } catch (err) {
      console.error("Error sending email:", err);
    }

    return new Response("Success", { status: 200 });
  }

  return new Response("Unhandled event", { status: 200 });
}

// Next.js raw body requirement
export const config = {
  api: {
    bodyParser: false,
  },
};
