import process from "node:process";
import { NextResponse } from "next/server";

const SUPABASE_TTS_URL =
  "https://yslhlomlsomknyxwtbtb.supabase.co/functions/v1/generate-tts";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const res = await fetch(SUPABASE_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        text: body.text,
        voice: body.voice,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("TTS Error:", errText);

      const r = new NextResponse(JSON.stringify({ error: errText }));
      r.headers.set("Content-Type", "application/json");
      r.headers.set("x-status", "500");
      return r;
    }

    const audioBuffer = await res.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (e) {
    console.error("API Error:", e);

    const r = new NextResponse(JSON.stringify({ error: `${e}` }));
    r.headers.set("Content-Type", "application/json");
    r.headers.set("x-status", "500");
    return r;
  }
}
