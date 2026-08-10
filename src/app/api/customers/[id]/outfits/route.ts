import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { saveBuffer } from "@/lib/storage";
import { downloadImage, extractSite, fetchOgImage } from "@/lib/ogImage";
import type { OutfitItem } from "@/lib/types";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await params;
  const db = getDb();

  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const contentType = req.headers.get("content-type") || "";
  const id = nanoid();
  const createdAt = new Date().toISOString();

  let sourceUrl: string | null = null;
  let sourceSite: string | null = null;
  let notes: string | null = null;
  let category: string | null = null;
  let outfitImagePath: string | null = null;
  let fetchStatus: OutfitItem["fetch_status"] = "pending";

  if (contentType.includes("multipart/form-data")) {
    // Manual upload path (used either for the initial add, or as a fallback after a failed auto-fetch)
    const formData = await req.formData();
    sourceUrl = (formData.get("sourceUrl") as string) || null;
    notes = (formData.get("notes") as string) || null;
    category = (formData.get("category") as string)?.trim() || null;
    sourceSite = sourceUrl ? extractSite(sourceUrl) : null;

    const file = formData.get("file");
    if (file instanceof File) {
      const buffer = Buffer.from(await file.arrayBuffer());
      outfitImagePath = saveBuffer("outfits", buffer, file.type);
      fetchStatus = "manual";
    }
  } else {
    const body = await req.json();
    sourceUrl = (body.sourceUrl || "").trim();
    notes = body.notes?.trim() || null;
    category = body.category?.trim() || null;

    if (!sourceUrl) {
      return NextResponse.json({ error: "sourceUrl is required" }, { status: 400 });
    }

    const og = await fetchOgImage(sourceUrl);
    sourceSite = og?.site ?? extractSite(sourceUrl);

    if (og) {
      const downloaded = await downloadImage(og.imageUrl);
      if (downloaded) {
        outfitImagePath = saveBuffer("outfits", downloaded.data, downloaded.mimeType);
        fetchStatus = "auto";
      } else {
        fetchStatus = "failed";
      }
    } else {
      fetchStatus = "failed";
    }
  }

  db.prepare(
    `INSERT INTO outfit_items (id, customer_id, source_url, source_site, outfit_image_path, fetch_status, notes, category, created_at)
     VALUES (@id, @customer_id, @source_url, @source_site, @outfit_image_path, @fetch_status, @notes, @category, @created_at)`
  ).run({
    id,
    customer_id: customerId,
    source_url: sourceUrl,
    source_site: sourceSite,
    outfit_image_path: outfitImagePath,
    fetch_status: fetchStatus,
    notes,
    category,
    created_at: createdAt,
  });

  const outfitItem: OutfitItem = {
    id,
    customer_id: customerId,
    source_url: sourceUrl,
    source_site: sourceSite,
    outfit_image_path: outfitImagePath,
    fetch_status: fetchStatus,
    notes,
    category,
    created_at: createdAt,
  };

  return NextResponse.json({ outfitItem }, { status: 201 });
}
