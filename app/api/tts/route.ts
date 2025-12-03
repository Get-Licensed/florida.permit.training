import { NextResponse } from "next/server";
import { synthesizeSpeech } from "@/supabase/functions/generate-tts/gcpTts";

export async function POST(req: Request) {
  try {
    const { text, voiceName } = await req.json();

    if (!text || !voiceName) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const audioBase64 = await synthesizeSpeech(text, voiceName);

    return NextResponse.json({
      audioContent: audioBase64,
    });
  } catch (err: any) {
    console.error("TTS ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
