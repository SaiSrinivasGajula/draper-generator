import type { GeneratedLook } from "./types";

/** Prefer the face-stitched final image; fall back to the headless AI-generated one. */
export function lookImagePath(
  look: Pick<GeneratedLook, "final_image_path" | "image_path">
): string | null {
  return look.final_image_path || look.image_path;
}
