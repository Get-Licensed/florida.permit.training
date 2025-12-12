import twilio from "twilio";
import { createClient } from "@/utils/supabaseServer";

export async function POST(req: Request) {
  try {
    const { phone, code, user_id } = await req.json();

    if (!phone || !code || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing data" }),
        { status: 400 }
      );
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const check = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (!check.valid) {
      return new Response(
        JSON.stringify({ success: false }),
        { status: 200 }
      );
    }

    const supabase = await createClient();

    await supabase
      .from("profiles")
      .update({
        phone_verified: true,
        home_phone: phone,
      })
      .eq("id", user_id);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Verification failed" }),
      { status: 500 }
    );
  }
}
