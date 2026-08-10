import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { UPLOADS_DIR } from "@/lib/config";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const resolved = path.join(UPLOADS_DIR, ...segments);

  // Prevent path traversal outside the uploads directory.
  const relative = path.relative(UPLOADS_DIR, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  try {
    const data = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";
    return new NextResponse(data as unknown as BodyInit, {
      headers: { "Content-Type": contentType, "Cache-Control": "private, max-age=86400" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
