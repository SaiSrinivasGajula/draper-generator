import { GEMINI_API_KEY, GEMINI_IMAGE_MODEL } from "./config";

type ImageInput = { data: Buffer; mimeType: string };

const PROMPT = `You are creating a fashion lookbook image. The first set of image(s) show a real person (reference photos of their face/body). The remaining image(s) each show one individual garment or accessory from an online store — together, these garments make up a single complete outfit (e.g. a top and a pair of trousers, or a top, bottom, and jacket).

Generate a single photorealistic, full-body image of the SAME person from the reference photos wearing ALL of the garments shown in the remaining images combined together as one cohesive outfit, standing in a neutral pose facing the camera. Preserve the person's face, body shape, and proportions accurately. Layer and fit each garment naturally and correctly on the body (e.g. tops on the upper body, bottoms on the lower body, outerwear over other layers) with realistic drape, lighting, and shadows, exactly as depicted in each garment photo — do not invent or substitute any garment. Use a solid, pure white background (like a studio cutout product photo) with soft, even lighting and no visible shadow on the background. Do not add any text, watermark, or logo.`;

export async function generateLookImage(
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
