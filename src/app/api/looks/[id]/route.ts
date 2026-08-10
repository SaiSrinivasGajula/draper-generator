import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = getDb();

  db.prepare("UPDATE generated_looks SET selected_for_lookbook = ? WHERE id = ?").run(
    body.selected ? 1 : 0,
    id
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare("DELETE FROM generated_looks WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
