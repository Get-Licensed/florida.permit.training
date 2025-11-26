import { GoogleAuth } from "google-auth-library";
import axios from "axios";

export async function synthesizeSpeech(text: string) {
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });

  const client = await auth.getClient();
  const accessToken = await client.getAccessToken();

  const response = await axios.post(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      input: { text },
      voice: {
        languageCode: "en-US",
        name: "en-US-Neural2-C"
      },
      audioConfig: { audioEncoding: "MP3" }
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
      },
    }
  );

  return response.data.audioContent; // Base64 MP3
}
