import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import process from "node:process";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

export async function POST(req: NextRequest) {
  try {
    /* ───────── AUTH (USER JWT) ───────── */
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;
    const course_id = "FL_PERMIT_TRAINING";
    const amount_cents = 5995;

    /* ───────── ADMIN CLIENT ───────── */
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    /* ───────── REUSE EXISTING OPEN INTENT ───────── */
    const { data: existing } = await supabaseAdmin
      .from("payments")
      .select("stripe_payment_intent_id, client_secret")
      .eq("user_id", user_id)
      .eq("course_id", course_id)
      .in("status", ["requires_payment", "requires_confirmation"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.client_secret) {
      return Response.json({
        clientSecret: existing.client_secret,
        reused: true,
      });
    }

    /* ───────── CREATE STRIPE INTENT ───────── */
    const intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      payment_method_types: ["card"],
      metadata: { user_id, course_id },
    });

    if (!intent.client_secret) {
      throw new Error("Stripe returned null client_secret");
    }

    /* ───────── INSERT PAYMENT ROW ───────── */
    await supabaseAdmin.from("payments").insert({
      user_id,
      course_id,
      stripe_payment_intent_id: intent.id,
      amount_cents,
      status: "requires_payment",
      client_secret: intent.client_secret,
    });

    return Response.json({
      clientSecret: intent.client_secret,
      reused: false,
    });
  } catch (err) {
    console.error("CREATE INTENT ERROR", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
