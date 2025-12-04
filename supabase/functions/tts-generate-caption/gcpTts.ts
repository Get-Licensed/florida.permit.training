// supabase/functions/tts-generate-caption/gcpTts.ts
import * as jose from "https://deno.land/x/jose@v5.2.0/index.ts";

export async function synthesizeSpeech(
  ssmlText: string,
  voice: string
): Promise<Uint8Array> {
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL");
  const rawPrivateKey = Deno.env.get("GOOGLE_PRIVATE_KEY");
// DEBUG (REMOVE AFTER)
console.log("DEBUG_PRIVATE_KEY:", JSON.stringify(rawPrivateKey));
console.log("DEBUG_CLIENT_EMAIL:", clientEmail);
  if (!clientEmail || !rawPrivateKey) {
    throw new Error("Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY env vars.");
  }

  // Fix "\n" escaping (Supabase stores PEMs with escaped newlines)
  const privateKeyPem = rawPrivateKey.replace(/\\n/g, "\n");

  // Import key
  const privateKey = await jose.importPKCS8(privateKeyPem, "RS256");

  //--------------------------------------------------------------------
  // REQUIRED FIX → Add "sub" claim
  //--------------------------------------------------------------------
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: clientEmail,
    sub: clientEmail,   // <---- REQUIRED
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // Sign JWT
  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  // Exchange JWT for OAuth token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&" +
      `assertion=${jwt}`,
  });

  const tokenJson = await tokenResp.json();
  if (!tokenResp.ok) {
    throw new Error(
      `OAuth error ${tokenResp.status}: ${JSON.stringify(tokenJson)}`
    );
  }

  const access_token = tokenJson.access_token;
  if (!access_token) {
    throw new Error(`OAuth error: missing access_token`);
  }

  //--------------------------------------------------------------------
  // Call Text-to-Speech API
  //--------------------------------------------------------------------
  const ttsResp = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({
        input: { ssml: ssmlText },
        voice: { languageCode: "en-US", name: voice },
        audioConfig: { audioEncoding: "MP3" },
      }),
    }
  );

  const ttsJson = await ttsResp.json();
  if (!ttsResp.ok) {
    throw new Error(
      `TTS error ${ttsResp.status}: ${JSON.stringify(ttsJson)}`
    );
  }

  const audioContent = ttsJson.audioContent;
  if (!audioContent) {
    throw new Error("TTS error: missing audioContent");
  }

  // base64 → bytes
  const binary = atob(audioContent);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  return bytes;
}
