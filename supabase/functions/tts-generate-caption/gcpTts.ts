// supabase/functions/tts-generate-caption/gcpTts.ts
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

/* -------------------------------------------------------
   WAV ENCODER (PCM16 → WAV)
------------------------------------------------------- */
function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;

  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  let offset = 0;
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;

  writeString("RIFF");
  view.setUint32(offset, 36 + pcm.length, true); offset += 4;
  writeString("WAVE");

  writeString("fmt ");
  view.setUint32(offset, 16, true); offset += 4; // Subchunk1Size
  view.setUint16(offset, 1, true); offset += 2; // AudioFormat = PCM
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, byteRate, true); offset += 4;
  view.setUint16(offset, (numChannels * bitsPerSample) / 8, true); offset += 2;
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  writeString("data");
  view.setUint32(offset, pcm.length, true); offset += 4;

  return new Uint8Array([...new Uint8Array(header), ...pcm]);
}

/* -------------------------------------------------------
   FINAL — CLEAN SSML + NO WHITESPACE
   Works for Chirp, Neural2, Standard, Wavenet
------------------------------------------------------- */
export async function synthesizeSpeech(
  ssmlInput: string,
  voice: string
): Promise<Uint8Array> {

  // CLEAN SSML
  const ssmlClean = `<speak>${ssmlInput.trim()}</speak>`;

  // 🔥 LOG EXACT SSML SENT TO GOOGLE
  console.log("Final SSML sent:", ssmlClean);


  /* ---------------------------------------------------
     Load Google OAuth credentials
  --------------------------------------------------- */
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const rawPrivateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");

  if (!clientEmail || !rawPrivateKey) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY env vars.");
  }

  const privateKeyPem = rawPrivateKey.replace(/\\n/g, "\n");
  const privateKey = await jose.importPKCS8(privateKeyPem, "RS256");

  /* ---------------------------------------------------
     Build JWT for Google OAuth
  --------------------------------------------------- */
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    sub: clientEmail, // REQUIRED for service accounts
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  /* ---------------------------------------------------
     Exchange JWT → OAuth access token
  --------------------------------------------------- */
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&" +
      `assertion=${jwt}`,
  });

  const tokenJson = await tokenResp.json();
  if (!tokenResp.ok) {
    throw new Error(`OAuth error ${tokenResp.status}: ${JSON.stringify(tokenJson)}`);
  }

  const accessToken = tokenJson.access_token;
  if (!accessToken) throw new Error("OAuth error: access_token missing");

  /* ---------------------------------------------------
     GOOGLE TTS REQUEST — LINEAR16 PCM
     (Chirp requires clean SSML)
  --------------------------------------------------- */
  const ttsResp = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { ssml: ssmlClean },
        voice: {
          languageCode: "en-US",
          name: voice,
        },
        audioConfig: {
          audioEncoding: "LINEAR16",
          sampleRateHertz: 24000,
        },
      }),
    }
  );

  const ttsJson = await ttsResp.json();
  if (!ttsResp.ok) {
    throw new Error(`TTS error ${ttsResp.status}: ${JSON.stringify(ttsJson)}`);
  }

  if (!ttsJson.audioContent) {
    throw new Error("TTS error: missing audioContent");
  }

  /* ---------------------------------------------------
     Base64 → PCM → WAV
  --------------------------------------------------- */
  const pcm = Uint8Array.from(atob(ttsJson.audioContent), c => c.charCodeAt(0));
  const wavBytes = pcmToWav(pcm);

  return wavBytes;
}
