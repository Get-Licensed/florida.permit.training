// supabase/functions/tts-generate-caption/index.ts
//----------------------------------------------------

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { synthesizeSpeech, getWavDuration } from "./gcpTts.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ------------------------------------------
// Four Neural2 Voices (Final Configuration)
// ------------------------------------------
const VOICES = [
  {
    code: "en-US-Neural2-A",
    urlKey: "published_audio_url_a",
    hashKey: "caption_hash_a",
  },
  {
    code: "en-US-Neural2-D",
    urlKey: "published_audio_url_d",
    hashKey: "caption_hash_d",
  },
  {
    code: "en-US-Neural2-I",
    urlKey: "published_audio_url_o",
    hashKey: "caption_hash_o",
  },
  {
    code: "en-US-Neural2-J",
    urlKey: "published_audio_url_j",
    hashKey: "caption_hash_j",
  },
];

/* ------------------------------------------------------
   Generate WAV → Upload → Update DB with:
     - URL
     - hash
     - seconds (for compliance)
------------------------------------------------------ */
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
  const existingUrl = row[voiceConfig.urlKey];

  // IMPORTANT: also check URL — if it's NULL, we MUST regenerate
  const needsUpdate =
    !existingUrl || !existingHash || existingHash !== hash;

  if (!needsUpdate) {
    skippedVoices.push(targetVoice);
    return;
  }

  // Escape HTML & apostrophes for safe SSML
  const cleaned = text
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/'/g, "&apos;")
    .replace(/,\s*/g, ", ");

  console.log("SSML CLEANED:", cleaned);

  // ---- Generate WAV ----
  const wavBytes = await synthesizeSpeech(cleaned, targetVoice);

// ---- Compute Duration (DO NOT ROUND UP) ----
const rawSeconds = getWavDuration(wavBytes);

// floor with small epsilon to avoid FP noise
const finalSeconds = Math.max(1, Math.floor(rawSeconds + 0.05));

console.log(
  `Voice ${targetVoice} → Raw: ${rawSeconds.toFixed(3)}s → Stored: ${finalSeconds}s`
);


  // ---- Upload WAV File ----
  const path = `${targetVoice}/${captionId}.wav`;

  const { error: uploadError } = await supabase.storage
    .from("tts_final")
    .upload(path, wavBytes, { upsert: true } as any);

  if (uploadError) throw uploadError;

  const publicUrl =
    `${SUPABASE_URL}/storage/v1/object/public/tts_final/${path}`;

  // ---- Update DB Row ----
  const updatePayload: any = {
    [voiceConfig.urlKey]: publicUrl,
    [voiceConfig.hashKey]: hash,
    seconds: finalSeconds, // UPDATE SECONDS FOR THIS VOICE
    updated_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("slide_captions")
    .update(updatePayload)
    .eq("id", captionId);

  if (updateError) throw updateError;

  updatedVoices.push(targetVoice);
}

/* ------------------------------------------------------
   MAIN HANDLER
------------------------------------------------------ */
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

    // 1. Generate requested voice first.
    await generateForVoice(
      row,
      voice,
      hash,
      captionId,
      text,
      updatedVoices,
      skippedVoices,
    );

    // 2. Then generate all remaining voices.
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
      }
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
