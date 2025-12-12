// deno-lint-ignore-file no-sloppy-imports

import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabaseServer";
import process from "node:process";
import Stripe from "stripe";

export async function POST(_req: NextRequest) {
  const client = await createSupabaseServerClient(); // ✅ FIX

  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  if (!secret || secret.includes("placeholder")) {
    return Response.json(
      { error: "Stripe not configured", clientSecret: null },
      { status: 503 }
    );
  }

  const { data: auth } = await client.auth.getUser();
  if (!auth?.user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const userId = auth.user.id;

  const stripe = new Stripe(secret);

  const { data: existing } = await client
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", "FL_PERMIT_TRAINING")
    .in("status", ["requires_payment", "processing"])
    .limit(1);

  if (existing?.length) {
    return Response.json(
      { clientSecret: existing[0].client_secret },
      { status: 200 }
    );
  }

  const pi = await stripe.paymentIntents.create({
    amount: 4900,
    currency: "usd",
    payment_method_types: ["card"], // ✅ REQUIRED
    metadata: {
      user_id: userId,
      course_id: "FL_PERMIT_TRAINING",
    },
  });


  const { error } = await client.from("payments").insert({
    user_id: userId,
    course_id: "FL_PERMIT_TRAINING",
    stripe_payment_intent_id: pi.id,
    amount_cents: 4900,
    status: "requires_payment",
    client_secret: pi.client_secret,
  });

  if (error) {
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
