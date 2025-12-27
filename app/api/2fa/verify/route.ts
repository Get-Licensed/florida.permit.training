import { NextResponse } from "next/server";
import twilio from "twilio";

export async function POST(req: Request) {
  try {
    const { phone, code, user_id } = await req.json();

    if (!phone || !code || !user_id) {
      return NextResponse.json(
        { error: "Missing phone, code, or user_id" },
        { status: 400 }
      );
    }

    if (!process.env.TWILIO_VERIFY_SID) {
      throw new Error("Twilio Verify SID missing");
    }

    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );

    const result = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({
        to: phone,
        code,
      });

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: "Invalid code" },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("2FA VERIFY ERROR:", err);
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
