import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { UPLOADS_DIR } from "./config";

export type UploadCategory = "reference" | "outfits" | "generated";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function extFromMime(mime: string | null | undefined): string {
  if (mime && EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  return "jpg";
}

/** Saves a file buffer under data/uploads/<category>/ and returns a storage-relative path. */
export function saveBuffer(category: UploadCategory, buffer: Buffer, mimeType?: string | null): string {
  const dir = path.join(UPLOADS_DIR, category);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${nanoid()}.${extFromMime(mimeType)}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `${category}/${filename}`;
}

/** Resolves a storage-relative path (as saved above) to an absolute path on disk. */
export function resolveStoragePath(relativePath: string): string {
  return path.join(UPLOADS_DIR, relativePath);
}

/** Public URL for a stored file, served via the /api/files route. */
export function fileUrl(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  return `/api/files/${relativePath}`;
}
