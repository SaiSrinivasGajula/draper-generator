import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { saveBuffer } from "@/lib/storage";

// Manual upload fallback for when auto-fetching the outfit image from the source URL failed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const outfit = db.prepare("SELECT id FROM outfit_items WHERE id = ?").get(id);
  if (!outfit) {
    return NextResponse.json({ error: "Outfit not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = saveBuffer("outfits", buffer, file.type);

  db.prepare(
    "UPDATE outfit_items SET outfit_image_path = ?, fetch_status = 'manual' WHERE id = ?"
  ).run(relativePath, id);

  return NextResponse.json({ outfitImagePath: relativePath });
}
