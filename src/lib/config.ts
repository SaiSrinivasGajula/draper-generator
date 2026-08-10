import path from "node:path";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data"));
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "draper.db");

export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const GEMINI_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

// Temporary stand-in for Gemini image generation until Gemini credentials are
// available. See src/lib/imageGen.ts for the provider selection logic.
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
export const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

// "gemini" or "openai" to force a provider; leave blank to auto-detect based
// on which API key above is set (Gemini takes priority when both are set).
export const IMAGE_PROVIDER_OVERRIDE = (process.env.IMAGE_PROVIDER || "").toLowerCase();

export const APP_PASSWORD = process.env.APP_PASSWORD || "";
