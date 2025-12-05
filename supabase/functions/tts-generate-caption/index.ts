// supabase/functions/tts-generate-caption/index.ts
//----------------------------------------------------

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeSpeech } from "./gcpTts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Voices
const VOICES = [
  {
    code: "en-US-Neural2-A",
    label: "Voice A (Neutral Male)",
    urlKey: "published_audio_url_a",
    hashKey: "caption_hash_a",
  },
  {
    code: "en-US-Neural2-D",
    label: "Voice D (Neural2 Male 1)",   // replaced Chirp-HD-D
    urlKey: "published_audio_url_d",
    hashKey: "caption_hash_d",
  },
  {
    code: "en-US-Neural2-I",
    label: "Voice I (Neural2 Male 2)",   // replaced Chirp-HD-O
    urlKey: "published_audio_url_o",     // reuse same DB column
    hashKey: "caption_hash_o",
  },
  {
    code: "en-US-Neural2-J",
    label: "Voice J (Neural2 Male 3)",
    urlKey: "published_audio_url_j",
    hashKey: "caption_hash_j",
  },
];


// ----------------------------------------------------------------------
// Helper: generate TTS → upload → update DB
// ----------------------------------------------------------------------
// ----------------------------------------------------------------------
// Helper: generate TTS → upload → update DB
// ----------------------------------------------------------------------
async function generateForVoice(
  row: any,
  targetVoice: string,
  hash: string,
  captionId: string,
  text: string,
  updatedVoices: string[],
  skippedVoices: string[],
) {
  const voiceConfig = VOICES.find((v) => v.code === targetVoice);
  if (!voiceConfig) return;

  const existingHash = row[voiceConfig.hashKey];
  const needsUpdate = !existingHash || existingHash !== hash;

  if (!needsUpdate) {
    skippedVoices.push(targetVoice);
    return;
  }

  // CLEAN PLAIN TEXT — NO <speak> TAGS HERE
  const cleaned = text
  .trim()
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")

  // CHIRP FIX: escape apostrophes
  .replace(/'/g, "&apos;")

  // CHIRP FIX: ensure comma spacing is consistent
  .replace(/,\s*/g, ", ")
  ;


  console.log("SSML CLEANED:", JSON.stringify(cleaned));

  // MUST send plain text — gcpTts.ts wraps <speak> for us
  const audioBytes = await synthesizeSpeech(cleaned, targetVoice);

  const wavBuffer = new Uint8Array(audioBytes).buffer;
  const file = new Blob([wavBuffer], { type: "audio/wav" });

  const path = `${targetVoice}/${captionId}.wav`;

  const { error: uploadError } = await supabase.storage
    .from("tts_final")
    .upload(path, file, { upsert: true } as any);

  if (uploadError) throw uploadError;

  const publicUrl =
    `${SUPABASE_URL}/storage/v1/object/public/tts_final/${path}`;

  const { error: updateError } = await supabase
    .from("slide_captions")
    .update({
      [voiceConfig.urlKey]: publicUrl,
      [voiceConfig.hashKey]: hash,
    })
    .eq("id", captionId);

  if (updateError) throw updateError;

  updatedVoices.push(targetVoice);
}

// ----------------------------------------------------------------------
// Main HTTP handler
// ----------------------------------------------------------------------
serve(async (req: Request) => {

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  console.log("Incoming request to tts-generate-caption");

  try {
    const bodyText = await req.text();
    console.log("Raw incoming body:", bodyText);

    const { captionId, text, hash, voice } = JSON.parse(bodyText);

    console.log("Parsed request:", { captionId, voice, hash });

    if (!captionId || !text || !hash || !voice) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: row, error: fetchError } = await supabase
      .from("slide_captions")
      .select("*")
      .eq("id", captionId)
      .single();

    if (fetchError) throw fetchError;

    const updatedVoices: string[] = [];
    const skippedVoices: string[] = [];

    // Generate requested voice
    await generateForVoice(
      row,
      voice,
      hash,
      captionId,
      text,
      updatedVoices,
      skippedVoices,
    );

    // Generate all other voices
    for (const v of VOICES) {
      if (v.code === voice) continue;
      await generateForVoice(
        row,
        v.code,
        hash,
        captionId,
        text,
        updatedVoices,
        skippedVoices,
      );
    }

    return new Response(
      JSON.stringify({ ok: true, updatedVoices, skippedVoices }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers":
            "authorization, x-client-info, apikey, content-type",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
        },
      },
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("ERROR in tts-generate-caption:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
});
