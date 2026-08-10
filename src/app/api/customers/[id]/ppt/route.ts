import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { buildLookbookPpt } from "@/lib/ppt";
import type { Customer, GeneratedLook, GeneratedLookItem, OutfitItem } from "@/lib/types";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await params;
  const db = getDb();

  const customer = db.prepare("SELECT * FROM customers WHERE id = ?").get(customerId) as
    | Customer
    | undefined;
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const selectedLooks = db
    .prepare(
      `SELECT * FROM generated_looks
       WHERE customer_id = ? AND selected_for_lookbook = 1 AND status = 'done' AND image_path IS NOT NULL
       ORDER BY created_at ASC`
    )
    .all(customerId) as GeneratedLook[];

  if (selectedLooks.length === 0) {
    return NextResponse.json(
      { error: "No looks are marked \"Use in lookbook\" yet — select some in the workspace first." },
      { status: 400 }
    );
  }

  const lookIds = selectedLooks.map((l) => l.id);
  const lookItemRows = db
    .prepare(
      `SELECT generated_look_id, outfit_item_id FROM generated_look_items
       WHERE generated_look_id IN (${lookIds.map(() => "?").join(",")})`
    )
    .all(...lookIds) as GeneratedLookItem[];

  const itemIdsByLook = new Map<string, string[]>();
  for (const row of lookItemRows) {
    const arr = itemIdsByLook.get(row.generated_look_id) ?? [];
    arr.push(row.outfit_item_id);
    itemIdsByLook.set(row.generated_look_id, arr);
  }

  const outfitIds = [
    ...new Set(
      selectedLooks.flatMap((l) => itemIdsByLook.get(l.id) ?? [l.outfit_item_id])
    ),
  ];
  const outfits = db
    .prepare(`SELECT * FROM outfit_items WHERE id IN (${outfitIds.map(() => "?").join(",")})`)
    .all(...outfitIds) as OutfitItem[];
  const outfitById = new Map(outfits.map((o) => [o.id, o]));

  const looksWithOutfit = selectedLooks
    .map((look) => {
      const ids = itemIdsByLook.get(look.id) ?? (look.outfit_item_id ? [look.outfit_item_id] : []);
      const looksOutfits = ids.map((oid) => outfitById.get(oid)).filter((o): o is OutfitItem => !!o);
      return looksOutfits.length > 0 ? { ...look, outfits: looksOutfits } : null;
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  try {
    const buffer = await buildLookbookPpt(customer, looksWithOutfit);
    const filename = `${customer.name.replace(/[^a-z0-9]+/gi, "-")}-outfit-styling.pptx`;

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to build PPT";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
