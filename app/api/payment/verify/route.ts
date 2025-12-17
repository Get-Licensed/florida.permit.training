import twilio from "twilio";
import process from "node:process";
import { getSupabaseAdmin } from "@/utils/supabaseAdmin";

export async function POST(req: Request): Promise<Response> {
  try {
    const { phone, code, user_id } = await req.json();

    if (!phone || !code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing phone, code, or user_id" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const check = await twilioClient.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (!check.valid) {
      return new Response(
        JSON.stringify({ success: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // ✅ ADMIN CLIENT (no access token required)
    const supabase = getSupabaseAdmin();

    await supabase
      .from("profiles")
      .update({
        phone_verified: true,
        home_phone: phone,
      })
      .eq("id", user_id)
      .throwOnError();

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("2FA VERIFY ERROR:", err);

    return new Response(
      JSON.stringify({ error: "Verification failed" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// 🔒 Ensures module classification for Next/Vercel
export {};
