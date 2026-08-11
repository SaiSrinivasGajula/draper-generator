import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { lookImagePath } from "@/lib/lookImage";
import { fileUrl } from "@/lib/storage";
import type { GeneratedLook, GeneratedLookItem, OutfitItem } from "@/lib/types";

// Public, no-login endpoint backing /lb/[token]. Deliberately returns only
// what a client should see: no contact info, no internal notes, no raw
// customer id, no non-selected/non-done/failed looks, no unused outfit items.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const customer = db
    .prepare("SELECT id, name, first_viewed_at FROM customers WHERE share_token = ?")
    .get(token) as { id: string; name: string; first_viewed_at: string | null } | undefined;

  if (!customer) {
    return NextResponse.json({ error: "This link isn't valid" }, { status: 404 });
  }

  if (!customer.first_viewed_at) {
    db.prepare("UPDATE customers SET first_viewed_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      customer.id
    );
  }

  const looks = db
    .prepare(
      `SELECT * FROM generated_looks
       WHERE customer_id = ? AND selected_for_lookbook = 1 AND status = 'done' AND image_path IS NOT NULL
       ORDER BY created_at ASC`
    )
    .all(customer.id) as GeneratedLook[];

  const lookIds = looks.map((l) => l.id);
  const lookItemRows = lookIds.length
    ? (db
        .prepare(
          `SELECT generated_look_id, outfit_item_id FROM generated_look_items
           WHERE generated_look_id IN (${lookIds.map(() => "?").join(",")})`
        )
        .all(...lookIds) as GeneratedLookItem[])
    : [];

  const itemIdsByLook = new Map<string, string[]>();
  for (const row of lookItemRows) {
    const arr = itemIdsByLook.get(row.generated_look_id) ?? [];
    arr.push(row.outfit_item_id);
    itemIdsByLook.set(row.generated_look_id, arr);
  }

  const outfitIds = [
    ...new Set(looks.flatMap((l) => itemIdsByLook.get(l.id) ?? [l.outfit_item_id])),
  ];
  const outfits = outfitIds.length
    ? (db
        .prepare(`SELECT * FROM outfit_items WHERE id IN (${outfitIds.map(() => "?").join(",")})`)
        .all(...outfitIds) as OutfitItem[])
    : [];
  const outfitById = new Map(outfits.map((o) => [o.id, o]));

  const responseLooks = looks
    .map((look) => {
      const imagePath = lookImagePath(look);
      if (!imagePath) return null;
      const ids = itemIdsByLook.get(look.id) ?? [look.outfit_item_id];
      const lookOutfits = ids.map((oid) => outfitById.get(oid)).filter((o): o is OutfitItem => !!o);
      const category = lookOutfits.find((o) => o.category?.trim())?.category?.trim() || "Looks";

      return {
        id: look.id,
        imageUrl: fileUrl(imagePath),
        loved: !!look.client_loved,
        category,
        outfits: lookOutfits.map((o) => ({ sourceSite: o.source_site, sourceUrl: o.source_url })),
      };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  return NextResponse.json({
    firstName: customer.name.split(" ")[0],
    looks: responseLooks,
  });
}
