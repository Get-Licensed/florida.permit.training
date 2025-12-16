import Stripe from "stripe";
import { NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/utils/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-11-17.clover",
});

console.log("ENV CHECK", {
  hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const accessToken = authHeader.replace("Bearer ", "");

    const supabase = createSupabaseServerClient(accessToken);

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const user_id = user.id;
    const course_id = "FL_PERMIT_TRAINING";
    const amount_cents = 5995;

    const intent = await stripe.paymentIntents.create({
      amount: amount_cents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { user_id, course_id },
    });

    await supabase.from("payments").insert({
      user_id,
      course_id,
      stripe_payment_intent_id: intent.id,
      amount_cents,
      status: "requires_payment",
      client_secret: intent.client_secret,
    });

    return Response.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error("CREATE INTENT ERROR", err);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
}
