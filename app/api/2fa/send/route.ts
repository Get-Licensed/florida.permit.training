import twilio from "twilio";
import process from "node:process";

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const authToken = process.env.TWILIO_AUTH_TOKEN!;
    const client = twilio(accountSid, authToken);

    // Twilio Tokens API using correct lowercase method
    await client.request({
      method: "post",
      uri: "/v2/Verify/Tokens",
      data: {
        to: phone,
        channel: "sms",
      },
    });

    return new Response(
      JSON.stringify({ status: "sent" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
