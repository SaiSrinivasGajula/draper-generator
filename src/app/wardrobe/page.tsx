"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Search } from "lucide-react";
import type { OutfitItemWithCustomer } from "@/lib/types";

function fileUrl(p: string | null) {
  return p ? `/api/files/${p}` : null;
}

export default function WardrobePage() {
  const [items, setItems] = useState<OutfitItemWithCustomer[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/outfits?${params.toString()}`);
    if (res.ok) {
      const json = await res.json();
      setItems(json.items ?? []);
      setCategories(json.categories ?? []);
    }
    setLoading(false);
  }, [category, q]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- debounced filter refetch
    setLoading(true);
    const timeout = setTimeout(load, q ? 250 : 0);
    return () => clearTimeout(timeout);
  }, [load, q]);

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent mb-2">DRAPER SOCIETY</p>
        <h1 className="font-display text-4xl font-bold text-ink mb-1">Wardrobe</h1>
        <p className="text-muted">
          Every garment added across all customers — a shared reference for the styling team.
        </p>
      </header>

      <div className="flex flex-wrap gap-3 mb-8">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-line rounded-lg px-3.5 py-2.5 text-ink bg-surface outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by customer name"
            className="w-full border border-line rounded-lg pl-10 pr-3.5 py-2.5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading wardrobe">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 rounded-2xl bg-line/40 animate-pulse"
              style={{ animationDuration: "1.4s" }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-line rounded-2xl">
          <p className="text-muted">No garments match this filter yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-surface border border-line rounded-2xl overflow-hidden transition-colors hover:border-ink/15"
            >
              <div className="w-full aspect-square bg-cream border-b border-line flex items-center justify-center overflow-hidden">
                {item.outfit_image_path ? (
                  <img
                    src={fileUrl(item.outfit_image_path)!}
                    alt={item.category || "Garment"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted">No image</span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  {item.category && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-cream text-muted border border-line">
                      {item.category}
                    </span>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-ink hover:text-accent transition-colors cursor-pointer"
                    >
                      {item.source_site || "Source"}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  )}
                </div>
                <Link
                  href={`/customers/${item.customer_id}`}
                  className="text-sm font-semibold text-ink hover:text-accent transition-colors cursor-pointer"
                >
                  Styled for {item.customer_name}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
