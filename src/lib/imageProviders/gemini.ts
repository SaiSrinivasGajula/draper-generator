import { GEMINI_API_KEY, GEMINI_IMAGE_MODEL } from "../config";
import { PROMPT } from "./prompt";

type ImageInput = { data: Buffer; mimeType: string };

export async function generateWithGemini(
  referencePhotos: ImageInput[],
  outfitPhotos: ImageInput[]
): Promise<Buffer> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  if (outfitPhotos.length === 0) {
    throw new Error("At least one outfit photo is required");
  }

  const parts = [
    { text: PROMPT },
    ...referencePhotos.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") },
    })),
    ...outfitPhotos.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data.toString("base64") },
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }] }),
    }
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const json = await res.json();
  const responseParts = json?.candidates?.[0]?.content?.parts ?? [];
  const imagePart = responseParts.find((p: { inlineData?: { data?: string } }) => p.inlineData?.data);

  if (!imagePart) {
    const textPart = responseParts.find((p: { text?: string }) => p.text)?.text;
    throw new Error(`Gemini did not return an image${textPart ? `: ${textPart.slice(0, 300)}` : ""}`);
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}
