"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ExternalLink, FileText, Loader2, Printer } from "lucide-react";
import type { Customer, GeneratedLookWithItems, OutfitItem } from "@/lib/types";

type CustomerData = {
  customer: Customer;
  outfitItems: OutfitItem[];
  generatedLooks: GeneratedLookWithItems[];
};

export default function LookbookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CustomerData | null>(null);
  const [creatingPpt, setCreatingPpt] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then((r) => r.json())
      .then(setData);
  }, [id]);

  async function handleCreatePpt() {
    setCreatingPpt(true);
    try {
      const res = await fetch(`/api/customers/${id}/ppt`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        alert(json.error || "Couldn't create the PPT");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data?.customer.name || "lookbook"}-outfit-styling.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCreatingPpt(false);
    }
  }

  if (!data) return <main className="flex-1 px-6 py-10 text-muted">Loading…</main>;

  const selectedLooks = data.generatedLooks.filter((l) => l.selected_for_lookbook);
  const outfitById = Object.fromEntries(data.outfitItems.map((o) => [o.id, o]));

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-14 no-print">
        <Link
          href={`/customers/${id}`}
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to workspace
        </Link>
        <div className="flex gap-3">
          <button
            onClick={handleCreatePpt}
            disabled={creatingPpt || selectedLooks.length === 0}
            className="inline-flex items-center gap-1.5 min-h-11 border border-line bg-surface rounded-lg px-4 py-2 font-semibold text-ink cursor-pointer transition-colors hover:border-ink/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingPpt ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <FileText size={16} aria-hidden="true" />
            )}
            {creatingPpt ? "Creating PPT…" : "Create PPT"}
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 min-h-11 bg-ink text-cream rounded-lg px-4 py-2 font-semibold cursor-pointer transition-colors hover:bg-ink/90"
          >
            <Printer size={16} aria-hidden="true" />
            Print / Save as PDF
          </button>
        </div>
      </div>

      <header className="mb-14 text-center">
        <p className="text-xs font-semibold tracking-[0.25em] text-accent mb-3">
          DRAPER SOCIETY
        </p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink">
          {data.customer.name}&apos;s Lookbook
        </h1>
      </header>

      {selectedLooks.length === 0 ? (
        <p className="text-center text-muted max-w-sm mx-auto">
          No looks selected yet — go back to the workspace and mark generated looks as
          &quot;In lookbook&quot;.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-10">
          {selectedLooks.map((look) => {
            const outfits = look.outfitItemIds
              .map((oid) => outfitById[oid])
              .filter((o): o is OutfitItem => !!o);
            const sites = outfits.map((o) => o.source_site).filter(Boolean);
            const image = look.image_path && (
              <img
                src={`/api/files/${look.image_path}`}
                alt={`${data.customer.name} wearing an outfit from ${sites.join(" + ") || "a store"}`}
                className="w-full rounded-2xl border border-line"
              />
            );
            return (
              <figure key={look.id} className="break-inside-avoid group">
                {image}
                {outfits.length > 0 && (
                  <figcaption className="mt-3 text-center flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                    {outfits.map((outfit) =>
                      outfit.source_url ? (
                        <a
                          key={outfit.id}
                          href={outfit.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold text-ink hover:text-accent transition-colors cursor-pointer"
                        >
                          {outfit.source_site || outfit.source_url}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ) : outfit.source_site ? (
                        <span key={outfit.id} className="text-sm text-muted">
                          {outfit.source_site}
                        </span>
                      ) : null
                    )}
                  </figcaption>
                )}
              </figure>
            );
          })}
        </div>
      )}
    </main>
  );
}
