import twilio from "twilio";
import process from "node:process";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone: string | undefined = body?.phone;

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("TWILIO VERIFY SID:", process.env.TWILIO_VERIFY_SID);

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID!)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return new Response(
      JSON.stringify({ sent: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown error";

    console.error("2FA SEND ERROR:", err);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
