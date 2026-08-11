import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { saveBuffer } from "@/lib/storage";
import type { GeneratedLook } from "@/lib/types";

// Saves the flattened, non-AI face-stitched composite produced by the
// FaceEditor (see src/components/FaceEditor.tsx) as a look's final image.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const look = db.prepare("SELECT * FROM generated_looks WHERE id = ?").get(id) as
    | GeneratedLook
    | undefined;
  if (!look) {
    return NextResponse.json({ error: "Look not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const finalImagePath = saveBuffer("generated", buffer, "image/png");

  db.prepare("UPDATE generated_looks SET final_image_path = ? WHERE id = ?").run(
    finalImagePath,
    id
  );

  return NextResponse.json({ ok: true, final_image_path: finalImagePath });
}
