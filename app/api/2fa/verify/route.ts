import { createServerClient } from "@supabase/ssr";
import twilio from "twilio";
import process from "node:process";

export async function POST(req: Request) {
  try {
    const { phone, code, user_id } = await req.json();

    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Phone and code required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const client = twilio(accountSid, authToken);

    // Verify token using Twilio Tokens API (TS-safe)
    const check = await client.request({
      method: "post",
      uri: "/v2/Verify/Tokens/Check",
      data: {
        to: phone,
        code,
      },
    });

    const valid = check?.data?.valid === true;

    if (!valid) {
      return new Response(
        JSON.stringify({ success: false }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Server-side Supabase client (correct for Next.js API routes)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get() {
            return "";
          },
        },
      }
    );

    await supabase
      .from("profiles")
      .update({ phone_verified: true })
      .eq("id", user_id);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
