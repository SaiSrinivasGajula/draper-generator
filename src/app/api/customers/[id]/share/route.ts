import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { generateUniqueShareToken } from "@/lib/shareToken";

// Lazily generates a customer's public share token (no share_token yet), or
// mints a fresh one when { regenerate: true } — which invalidates the old
// link immediately since the row no longer matches it.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const db = getDb();

  const customer = db.prepare("SELECT share_token FROM customers WHERE id = ?").get(id) as
    | { share_token: string | null }
    | undefined;
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  let token = customer.share_token;
  if (!token || body?.regenerate) {
    token = generateUniqueShareToken(db);
    db.prepare("UPDATE customers SET share_token = ? WHERE id = ?").run(token, id);
  }

  return NextResponse.json({ shareToken: token });
}
