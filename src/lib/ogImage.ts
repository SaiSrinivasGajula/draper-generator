function extractSite(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

/** Fetches a product page and pulls the og:image URL + hostname. Returns null if it can't be found. */
export async function fetchOgImage(
  sourceUrl: string
): Promise<{ imageUrl: string; site: string } | null> {
  const site = extractSite(sourceUrl);

  try {
    const res = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

    if (!match) return null;

    const imageUrl = new URL(match[1], sourceUrl).toString();
    return { imageUrl, site };
  } catch {
    return null;
  }
}

export async function downloadImage(
  imageUrl: string
): Promise<{ data: Buffer; mimeType: string } | null> {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const mimeType = res.headers.get("content-type") || "image/jpeg";
    const data = Buffer.from(await res.arrayBuffer());
    return { data, mimeType };
  } catch {
    return null;
  }
}

export { extractSite };
