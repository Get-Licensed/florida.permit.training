// app/api/tts/route.ts
//----------------------------------------------------

import { NextResponse } from "next/server";

// Load env vars using Deno-safe version
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface TtsRequestBody {
  captionId: string;
  text: string;
  hash: string;
  voice: string;
}

export async function POST(req: Request) {
  try {
    const body: TtsRequestBody = await req.json();

    const res = await fetch(
      `${SUPABASE_URL}/functions/v1/tts-generate-caption`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify(body),
      }
    );

    // Edge function ALWAYS returns JSON
    const json = await res.json();

    return NextResponse.json(json);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Unknown error during TTS request";

    // NO "status" here because NextResponse.json doesn't allow it
    return NextResponse.json({ error: msg });
  }
}
