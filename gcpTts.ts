import { GoogleAuth } from "google-auth-library";
import axios from "axios";

export async function synthesizeSpeech(text: string, voiceName: string) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  // auto language detection
  const languageCode = voiceName.startsWith("es-") ? "es-US" : "en-US";

  const response = await axios.post(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      input: { text },
      voice: {
        languageCode,
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
      },
    }
  );

  return response.data.audioContent; // Base64 MP3
}
