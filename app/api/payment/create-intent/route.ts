// app/api/payment/create-intent/route.ts

import { NextRequest } from "next/server";
import { supabase } from "@/utils/supabaseClient";
import process from "node:process";
import Stripe from "stripe";

export async function POST(_req: NextRequest) {
  const client = supabase;

  // Check if Stripe is configured (placeholder-safe)
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secret || secret.includes("placeholder")) {
    return Response.json(
      {
        error: "Stripe not configured",
        clientSecret: null,
      },
      { status: 503 }
    );
  }

  // Auth
  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const userId = auth.user.id;

  // Stripe client (auto-version)
  const stripe = new Stripe(secret, {
    // @ts-ignore
    apiVersion: undefined,
  });

  // Look for open payment
  const { data: existing } = await client
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .in("status", ["requires_payment", "processing"])
    .limit(1);

  if (Array.isArray(existing) && existing.length > 0) {
    return Response.json(
      { clientSecret: existing[0].client_secret },
      { status: 200 }
    );
  }

  // Create PaymentIntent (example price)
  const amount_cents = 4900;
  const pi = await stripe.paymentIntents.create({
    amount: amount_cents,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      user_id: userId,
      course_id: "FL_PERMIT_TRAINING",
    },
  });

  // Store in DB
  const { error: insertErr } = await client.from("payments").insert({
    user_id: userId,
    course_id: "FL_PERMIT_TRAINING",
    stripe_payment_intent_id: pi.id,
    amount_cents,
    status: "requires_payment",
    client_secret: pi.client_secret,
  });

  if (insertErr) {
    return Response.json(
      { error: "Failed to store PaymentIntent" },
      { status: 500 }
    );
  }

  return Response.json(
    { clientSecret: pi.client_secret },
    { status: 200 }
  );
}
