import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import type { Customer } from "@/lib/types";

export async function GET() {
  const db = getDb();
  const customers = db
    .prepare("SELECT * FROM customers ORDER BY created_at DESC")
    .all() as Customer[];
  return NextResponse.json({ customers });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = (body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const customer: Customer = {
    id: nanoid(),
    name,
    contact: body.contact?.trim() || null,
    notes: body.notes?.trim() || null,
    created_at: new Date().toISOString(),
    share_token: null,
    first_viewed_at: null,
  };

  db.prepare(
    "INSERT INTO customers (id, name, contact, notes, created_at) VALUES (@id, @name, @contact, @notes, @created_at)"
  ).run(customer);

  return NextResponse.json({ customer }, { status: 201 });
}
