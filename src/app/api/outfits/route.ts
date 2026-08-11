import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { OutfitItemWithCustomer } from "@/lib/types";

// Cross-client wardrobe repository: every garment ever added, across all
// customers, optionally filtered by category and/or customer name.
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category")?.trim() || null;
  const q = searchParams.get("q")?.trim() || null;

  const items = db
    .prepare(
      `SELECT oi.*, c.name as customer_name
       FROM outfit_items oi
       JOIN customers c ON c.id = oi.customer_id
       WHERE (@category IS NULL OR oi.category = @category)
         AND (@q IS NULL OR c.name LIKE '%' || @q || '%')
       ORDER BY oi.created_at DESC`
    )
    .all({ category, q }) as OutfitItemWithCustomer[];

  const categories = (
    db
      .prepare(
        `SELECT DISTINCT category FROM outfit_items
         WHERE category IS NOT NULL AND TRIM(category) != ''
         ORDER BY category`
      )
      .all() as { category: string }[]
  ).map((r) => r.category);

  return NextResponse.json({ items, categories });
}
