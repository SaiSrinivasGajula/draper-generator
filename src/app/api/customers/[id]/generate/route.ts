import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { resolveStoragePath, saveBuffer } from "@/lib/storage";
import { generateLookImage } from "@/lib/imageGen";
import { GEMINI_API_KEY } from "@/lib/config";
import type { OutfitItem, ReferencePhoto } from "@/lib/types";

function mimeFromPath(p: string): string {
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "AI image generation isn't enabled yet on this deployment.", code: "AI_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const { id: customerId } = await params;
  const body = await req.json().catch(() => ({}));
  const outfitItemIds = Array.from(new Set<string>(body?.outfitItemIds ?? []));

  if (!Array.isArray(body?.outfitItemIds) || outfitItemIds.length < 2) {
    return NextResponse.json(
      { error: "Select at least 2 items to generate a combined look" },
      { status: 400 }
    );
  }

  const db = getDb();

  const outfits = outfitItemIds.map((outfitId) => {
    const outfit = db.prepare("SELECT * FROM outfit_items WHERE id = ?").get(outfitId) as
      | OutfitItem
      | undefined;
    return { outfitId, outfit };
  });

  const missing = outfits.filter((o) => !o.outfit).map((o) => o.outfitId);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Outfit item(s) not found: ${missing.join(", ")}` }, { status: 404 });
  }

  const wrongCustomer = outfits.filter((o) => o.outfit!.customer_id !== customerId);
  if (wrongCustomer.length > 0) {
    return NextResponse.json(
      { error: "One or more selected items don't belong to this customer" },
      { status: 400 }
    );
  }

  const noImage = outfits.filter((o) => !o.outfit!.outfit_image_path).map((o) => o.outfitId);
  if (noImage.length > 0) {
    return NextResponse.json(
      { error: "Some selected items have no image yet — upload one before generating" },
      { status: 400 }
    );
  }

  const referencePhotos = db
    .prepare("SELECT * FROM reference_photos WHERE customer_id = ? ORDER BY created_at ASC")
    .all(customerId) as ReferencePhoto[];

  if (referencePhotos.length === 0) {
    return NextResponse.json(
      { error: "This customer has no reference photos yet" },
      { status: 400 }
    );
  }

  const lookId = nanoid();
  const createdAt = new Date().toISOString();

  const insertLookAndItems = db.transaction(() => {
    db.prepare(
      `INSERT INTO generated_looks (id, customer_id, outfit_item_id, image_path, status, error, selected_for_lookbook, created_at)
       VALUES (?, ?, ?, NULL, 'pending', NULL, 0, ?)`
    ).run(lookId, customerId, outfitItemIds[0], createdAt);

    const insertItem = db.prepare(
      `INSERT INTO generated_look_items (generated_look_id, outfit_item_id) VALUES (?, ?)`
    );
    for (const outfitId of outfitItemIds) {
      insertItem.run(lookId, outfitId);
    }
  });
  insertLookAndItems();

  try {
    const referenceInputs = await Promise.all(
      referencePhotos.map(async (photo) => ({
        data: await fs.readFile(resolveStoragePath(photo.file_path)),
        mimeType: mimeFromPath(photo.file_path),
      }))
    );

    const outfitInputs = await Promise.all(
      outfits.map(async ({ outfit }) => ({
        data: await fs.readFile(resolveStoragePath(outfit!.outfit_image_path!)),
        mimeType: mimeFromPath(outfit!.outfit_image_path!),
      }))
    );

    const resultBuffer = await generateLookImage(referenceInputs, outfitInputs);
    const imagePath = saveBuffer("generated", resultBuffer, "image/png");

    db.prepare("UPDATE generated_looks SET status = 'done', image_path = ? WHERE id = ?").run(
      imagePath,
      lookId
    );

    return NextResponse.json({
      generatedLook: {
        id: lookId,
        customer_id: customerId,
        outfit_item_id: outfitItemIds[0],
        outfitItemIds,
        image_path: imagePath,
        status: "done",
        error: null,
        selected_for_lookbook: 0,
        created_at: createdAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    db.prepare("UPDATE generated_looks SET status = 'failed', error = ? WHERE id = ?").run(
      message,
      lookId
    );
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
