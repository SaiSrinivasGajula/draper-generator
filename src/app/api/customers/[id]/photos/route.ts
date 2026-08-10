import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { saveBuffer } from "@/lib/storage";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = await params;
  const db = getDb();

  const customer = db.prepare("SELECT id FROM customers WHERE id = ?").get(customerId);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const formData = await req.formData();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File);

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const insert = db.prepare(
    "INSERT INTO reference_photos (id, customer_id, file_path, created_at) VALUES (?, ?, ?, ?)"
  );

  const saved = [];
  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const relativePath = saveBuffer("reference", buffer, file.type);
    const id = nanoid();
    const createdAt = new Date().toISOString();
    insert.run(id, customerId, relativePath, createdAt);
    saved.push({ id, customer_id: customerId, file_path: relativePath, created_at: createdAt });
  }

  return NextResponse.json({ referencePhotos: saved }, { status: 201 });
}
