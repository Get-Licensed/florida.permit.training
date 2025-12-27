import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.TWILIO_VERIFY_SID) {
      throw new Error("Twilio Verify SID missing");
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    return new Response(
      JSON.stringify({ sent: true }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("2FA SEND ERROR:", err);

    return new Response(
      JSON.stringify({ error: "Failed to send verification code" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
