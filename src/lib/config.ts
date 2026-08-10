import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "draper.db");

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

export const APP_PASSWORD = process.env.APP_PASSWORD || "";
