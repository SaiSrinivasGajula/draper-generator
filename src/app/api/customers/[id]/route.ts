import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type {
  Customer,
  GeneratedLook,
  GeneratedLookItem,
  GeneratedLookWithItems,
  OutfitItem,
  ReferencePhoto,
} from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as
    | Customer
    | undefined;
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const referencePhotos = db
    .prepare("SELECT * FROM reference_photos WHERE customer_id = ? ORDER BY created_at ASC")
    .all(id) as ReferencePhoto[];

  const outfitItems = db
    .prepare("SELECT * FROM outfit_items WHERE customer_id = ? ORDER BY created_at DESC")
    .all(id) as OutfitItem[];

  const generatedLooksRaw = db
    .prepare("SELECT * FROM generated_looks WHERE customer_id = ? ORDER BY created_at DESC")
    .all(id) as GeneratedLook[];

  const lookItemRows = db
    .prepare(
      `SELECT gli.generated_look_id, gli.outfit_item_id
       FROM generated_look_items gli
       JOIN generated_looks gl ON gl.id = gli.generated_look_id
       WHERE gl.customer_id = ?`
    )
    .all(id) as GeneratedLookItem[];

  const itemsByLook = new Map<string, string[]>();
  for (const row of lookItemRows) {
    const arr = itemsByLook.get(row.generated_look_id) ?? [];
    arr.push(row.outfit_item_id);
    itemsByLook.set(row.generated_look_id, arr);
  }

  const generatedLooks: GeneratedLookWithItems[] = generatedLooksRaw.map((l) => ({
    ...l,
    outfitItemIds: itemsByLook.get(l.id) ?? (l.outfit_item_id ? [l.outfit_item_id] : []),
  }));

  return NextResponse.json({ customer, referencePhotos, outfitItems, generatedLooks });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM customers WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
