import { GEMINI_API_KEY, OPENAI_API_KEY, IMAGE_PROVIDER_OVERRIDE } from "./config";
import { generateWithGemini } from "./imageProviders/gemini";
import { generateWithOpenAI } from "./imageProviders/openai";

type ImageInput = { data: Buffer; mimeType: string };
type ImageProvider = "gemini" | "openai";

// Resolves which backend generates look images. Gemini is the intended
// long-term provider; OpenAI is a temporary stand-in while Gemini credentials
// are unavailable. Once GEMINI_API_KEY is set, generation switches back to
// Gemini automatically — no code change needed.
function resolveProvider(): ImageProvider | null {
  if (IMAGE_PROVIDER_OVERRIDE === "gemini" || IMAGE_PROVIDER_OVERRIDE === "openai") {
    return IMAGE_PROVIDER_OVERRIDE;
  }
  if (GEMINI_API_KEY) return "gemini";
  if (OPENAI_API_KEY) return "openai";
  return null;
}

export function isImageGenConfigured(): boolean {
  return resolveProvider() !== null;
}

export async function generateLookImage(
  referencePhotos: ImageInput[],
  outfitPhotos: ImageInput[]
): Promise<Buffer> {
  const provider = resolveProvider();

  if (provider === "gemini") return generateWithGemini(referencePhotos, outfitPhotos);
  if (provider === "openai") return generateWithOpenAI(referencePhotos, outfitPhotos);

  throw new Error("No image generation provider is configured");
}
