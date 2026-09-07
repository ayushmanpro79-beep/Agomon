import { Opencode } from "@opencode-ai/sdk";

export async function streamOpencodeEvents() {
  if (!process.env.OPENCODE_ZEN_API_KEY) {
    throw new Error("Missing OPENCODE_ZEN_API_KEY");
  }

  const client = new Opencode({
    apiKey: process.env.OPENCODE_ZEN_API_KEY,
  });

  try {
    const stream = await client.event.list();

    for await (const event of stream) {
      console.log(event);
    }
  } catch (error) {
    console.error("OpenCode stream failed:", error);
    throw error;
  }
}
