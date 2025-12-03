/// <reference lib="deno.ns" />
import * as jose from "https://deno.land/x/jose@v4.15.5/index.ts";

/* ------------------------------------------------------
   LOAD GOOGLE SERVICE ACCOUNT (Base64 → JSON)
------------------------------------------------------ */
export function loadServiceAccount() {
  const raw = Deno.env.get("GOOGLE_TTS_SERVICE_ACCOUNT");
  if (!raw) throw new Error("GOOGLE_TTS_SERVICE_ACCOUNT not set");

  let decoded: string;
  try {
    decoded = atob(raw);
  } catch (_e) {
    throw new Error("Failed to base64 decode GOOGLE_TTS_SERVICE_ACCOUNT");
  }

  try {
    return JSON.parse(decoded);
  } catch (_e) {
    console.error("Decoded JSON:", decoded);
    throw new Error("Failed to parse GOOGLE_TTS_SERVICE_ACCOUNT JSON");
  }
}

/* ------------------------------------------------------
   MAKE GOOGLE ACCESS TOKEN (1 hour)
------------------------------------------------------ */
async function createGoogleAccessToken(sa: any) {
  const now = Math.floor(Date.now() / 1000);

  const claims = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  // Convert private key correctly for jose
  const privateKey = await jose.importPKCS8(sa.private_key, "RS256");

  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResponse.ok) {
    const body = await tokenResponse.text();
    throw new Error("OAuth token error: " + body);
  }

  const json = await tokenResponse.json();
  return json.access_token;
}

/* ------------------------------------------------------
   MAIN SYNTHESIZER
   text        = plain text or SSML
   isSsml      = true if text contains SSML (<speak>)
------------------------------------------------------ */
export async function synthesizeSpeech(
  text: string,
  voice: string,
  isSsml = false,
) {
  try {
    const sa = loadServiceAccount();
    const accessToken = await createGoogleAccessToken(sa);

    const requestBody = {
      input: isSsml ? { ssml: text } : { text },
      voice: {
        languageCode: "en-US",
        name: voice,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 1.0,
        pitch: 0,
      },
    };

    const ttsResponse = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!ttsResponse.ok) {
      const body = await ttsResponse.text();
      throw new Error("Google TTS API error: " + body);
    }

    const { audioContent } = await ttsResponse.json();
    if (!audioContent) {
      throw new Error("Google TTS returned empty audioContent");
    }

    // Base64 → bytes
    const binary = atob(audioContent);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return bytes;

  } catch (err) {
    console.error("Google TTS Error:", err);
    throw err;
  }
}
