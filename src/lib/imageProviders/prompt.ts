// Shared instruction prompt used by every image-generation provider, so
// switching providers (see src/lib/imageGen.ts) doesn't change the output style.
//
// Deliberately headless: getting AI models to preserve a specific person's
// face reliably has been unreliable across providers. Instead we generate
// only the body wearing the outfit, and the real face is stitched on
// afterward without AI (see src/components/FaceEditor.tsx).
export const PROMPT = `You are creating a fashion product photo for a styling lookbook. The first set of image(s) are reference photos of a real person — use them ONLY to match body shape, proportions, and skin tone. The remaining image(s) each show one individual garment or accessory from an online store — together, these garments make up a single complete outfit (e.g. a top and a pair of trousers, or a top, bottom, and jacket).

Generate a single photorealistic image of a body wearing ALL of the garments shown combined together as one cohesive outfit, matching the body shape, proportions, and skin tone from the reference photos. Standing in a neutral, symmetrical, front-facing pose. Layer and fit each garment naturally and correctly on the body (e.g. tops on the upper body, bottoms on the lower body, outerwear over other layers) with realistic drape, lighting, and shadows, exactly as depicted in each garment photo — do not invent or substitute any garment. Use a solid, pure white background (like a studio cutout product photo) with soft, even lighting and no visible shadow on the background. Do not add any text, watermark, or logo.

IMPORTANT: The image must be cropped at the neck/collarbone. Do NOT generate a head, face, hair, or neck of any kind — the frame starts at the shoulders and shows only the body and clothing below that point. This is intentional: a real photo of the person's face will be added separately afterward.`;
