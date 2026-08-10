import { OPENAI_API_KEY, OPENAI_IMAGE_MODEL } from "../config";
import { PROMPT } from "./prompt";

type ImageInput = { data: Buffer; mimeType: string };

function extFromMime(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

export async function generateWithOpenAI(
  referencePhotos: ImageInput[],
  outfitPhotos: ImageInput[]
): Promise<Buffer> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (outfitPhotos.length === 0) {
    throw new Error("At least one outfit photo is required");
  }

  const form = new FormData();
  form.set("model", OPENAI_IMAGE_MODEL);
  form.set("prompt", PROMPT);
  for (const img of [...referencePhotos, ...outfitPhotos]) {
    const blob = new Blob([new Uint8Array(img.data)], { type: img.mimeType });
    form.append("image[]", blob, `image.${extFromMime(img.mimeType)}`);
  }

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 500)}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error("OpenAI did not return an image");
  }

  return Buffer.from(b64, "base64");
}
