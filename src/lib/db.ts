import Database from "better-sqlite3";
import fs from "node:fs";
import { DATA_DIR, DB_PATH } from "./config";

fs.mkdirSync(DATA_DIR, { recursive: true });

declare global {
  var __draperDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (global.__draperDb) return global.__draperDb;

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reference_photos (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outfit_items (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      source_url TEXT,
      source_site TEXT,
      outfit_image_path TEXT,
      fetch_status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      category TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS generated_looks (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      outfit_item_id TEXT NOT NULL REFERENCES outfit_items(id) ON DELETE CASCADE,
      image_path TEXT,
      final_image_path TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      error TEXT,
      selected_for_lookbook INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    -- Many-to-many: which outfit_items were combined into a given generated look.
    -- outfit_item_id above is kept (set to the first selected item) for backward compat;
    -- this table is the source of truth for the full set of contributing items.
    CREATE TABLE IF NOT EXISTS generated_look_items (
      generated_look_id TEXT NOT NULL REFERENCES generated_looks(id) ON DELETE CASCADE,
      outfit_item_id TEXT NOT NULL REFERENCES outfit_items(id) ON DELETE CASCADE,
      PRIMARY KEY (generated_look_id, outfit_item_id)
    );

    CREATE INDEX IF NOT EXISTS idx_reference_photos_customer ON reference_photos(customer_id);
    CREATE INDEX IF NOT EXISTS idx_outfit_items_customer ON outfit_items(customer_id);
    CREATE INDEX IF NOT EXISTS idx_generated_looks_customer ON generated_looks(customer_id);
    CREATE INDEX IF NOT EXISTS idx_generated_looks_outfit ON generated_looks(outfit_item_id);
    CREATE INDEX IF NOT EXISTS idx_generated_look_items_look ON generated_look_items(generated_look_id);
    CREATE INDEX IF NOT EXISTS idx_generated_look_items_outfit ON generated_look_items(outfit_item_id);
  `);

  const outfitColumns = db.prepare("PRAGMA table_info(outfit_items)").all() as { name: string }[];
  if (!outfitColumns.some((c) => c.name === "category")) {
    db.exec("ALTER TABLE outfit_items ADD COLUMN category TEXT");
  }

  // final_image_path holds the composited image after a real face photo has
  // been manually stitched onto a headless generated look (see /api/looks/[id]/face).
  const lookColumns = db.prepare("PRAGMA table_info(generated_looks)").all() as { name: string }[];
  if (!lookColumns.some((c) => c.name === "final_image_path")) {
    db.exec("ALTER TABLE generated_looks ADD COLUMN final_image_path TEXT");
  }

  // One-time backfill: older generated_looks rows predate generated_look_items.
  // Idempotent — only runs while the join table is still empty.
  const { c: lookItemCount } = db
    .prepare("SELECT COUNT(*) as c FROM generated_look_items")
    .get() as { c: number };
  if (lookItemCount === 0) {
    db.exec(`
      INSERT OR IGNORE INTO generated_look_items (generated_look_id, outfit_item_id)
      SELECT id, outfit_item_id FROM generated_looks WHERE outfit_item_id IS NOT NULL
    `);
  }

  global.__draperDb = db;
  return db;
}
