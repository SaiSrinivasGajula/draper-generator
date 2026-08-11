import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Toggles a look's client_loved flag. Scoped entirely by a single UPDATE's
// WHERE clause — a token can only ever affect looks belonging to the
// customer it resolves to, and only ones still eligible for the public view.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; lookId: string }> }
) {
  const { token, lookId } = await params;
  const body = await req.json().catch(() => ({}));
  const loved = !!body?.loved;
  const db = getDb();

  const result = db
    .prepare(
      `UPDATE generated_looks
       SET client_loved = ?
       WHERE id = ?
         AND selected_for_lookbook = 1 AND status = 'done'
         AND customer_id = (SELECT id FROM customers WHERE share_token = ?)`
    )
    .run(loved ? 1 : 0, lookId, token);

  if (result.changes === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, loved });
}
