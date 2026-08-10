# Draper Society — Lookbook Studio

Internal tool for building AI-generated customer lookbooks: manage customer reference photos, drop in outfit links from stores like Zara/Myntra, and generate images of each customer wearing each outfit.

## Setup

1. Copy the env file and fill in values:

   ```
   cp .env.example .env
   ```

   - `GEMINI_API_KEY` — required for the "Generate look" button. Get one from [Google AI Studio](https://aistudio.google.com/apikey).
   - `APP_PASSWORD` — optional shared password for the team. Leave blank while developing locally.
   - `DATA_DIR` — where the SQLite DB and uploaded images live. Defaults to `./data`.

2. Install dependencies and run:

   ```
   npm install
   npm run dev
   ```

3. Open http://localhost:3000

## How it works

- **Customers** (`/`): create a customer profile per demo lead.
- **Workspace** (`/customers/[id]`): upload 3–4 reference photos, paste outfit product links (the tool tries to auto-fetch the product image via the page's `og:image` tag — if that fails, upload the outfit photo manually), then hit "Generate look" to create an AI image of that customer wearing the outfit.
- **Lookbook** (`/customers/[id]/lookbook`): mark generated looks as "Use in lookbook" in the workspace, then view/print them here (Print → Save as PDF works for sharing with the customer).

## Deploying

This app stores everything (SQLite DB + images) on local disk under `DATA_DIR`, so it needs a host with a **persistent volume** — not a serverless platform like Vercel. Railway or Fly.io both work well: mount a volume, set `DATA_DIR` to that mount path, and set `GEMINI_API_KEY` / `APP_PASSWORD` as environment variables.

## Notes

- Image generation uses a general-purpose image-editing model (Gemini 2.5 Flash Image), not a specialized virtual try-on model. Validate output quality against real reference photos before relying on it for customer-facing lookbooks.
- Auth is a single shared password gate, not per-user accounts — fine for a small team, revisit if it grows.
