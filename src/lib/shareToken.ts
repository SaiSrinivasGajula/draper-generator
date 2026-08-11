import Database from "better-sqlite3";
import { nanoid } from "nanoid";

/**
 * Generates a share token guaranteed unique among customers.share_token.
 * Collisions are astronomically unlikely at nanoid(10) (~61 bits of entropy)
 * but we retry defensively rather than assume.
 */
export function generateUniqueShareToken(db: Database.Database): string {
  const exists = db.prepare("SELECT 1 FROM customers WHERE share_token = ?");
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = nanoid(10);
    if (!exists.get(token)) return token;
  }
  throw new Error("Could not generate a unique share token");
}
