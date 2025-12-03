import { serve } from "std/http/server.ts";
import { synthesizeSpeech } from "./gcpTts.ts";

/* ------------------------------------------------------
   GLOBAL CORS
------------------------------------------------------ */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // Preflight from browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { text, voice } = await req.json();

    // SSML wrapper to prevent cutting first word
    const ssml = `
<speak>
  <break time="150ms"/>
  ${text}
</speak>
    `.trim();

    const audioBytes = await synthesizeSpeech(
      ssml,
      voice ?? "en-US-Neural2-A",
      true // SSML mode enabled
    );

    return new Response(audioBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
      },
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});

console.log("Listening on http://localhost:9999/");
