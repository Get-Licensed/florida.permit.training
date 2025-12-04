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
  { code: "en-US-Neural2-D", urlKey: "published_audio_url_d", hashKey: "caption_hash_d" }, // Male
  { code: "en-US-Neural2-A", urlKey: "published_audio_url_a", hashKey: "caption_hash_a" }, // Male
  { code: "en-US-Neural2-C", urlKey: "published_audio_url_c", hashKey: "caption_hash_c" }, // Male
];


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
  const voiceConfig = VOICES.find(v => v.code === targetVoice);
  if (!voiceConfig) return;

  const existingHash = row[voiceConfig.hashKey];
  const needsUpdate = !existingHash || existingHash !== hash;

  if (!needsUpdate) {
    skippedVoices.push(targetVoice);
    return;
  }

  const ssml = `
    <speak>
      <break time="150ms"/>
      ${text}
    </speak>
  `;

  // Get MP3 audio
  const audioBytes: Uint8Array = await synthesizeSpeech(ssml, targetVoice);

  // Create Blob safely (no SharedArrayBuffer issues)
  const safeBuffer = new Uint8Array(audioBytes).buffer;  // guaranteed ArrayBuffer
  const file = new Blob([safeBuffer], { type: "audio/mpeg" });


  // Storage path
  const path = `${targetVoice}/${captionId}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from("tts_final")
    .upload(path, file, { upsert: true } as any);

  if (uploadError) throw uploadError;

  // Public URL
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/tts_final/${path}`;

  // Update DB
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
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const { captionId, text, hash, voice } = await req.json();

    if (!captionId || !text || !hash || !voice) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Load row
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
        },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
