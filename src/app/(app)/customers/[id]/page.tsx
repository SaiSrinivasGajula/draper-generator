"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Heart,
  Loader2,
  Plus,
  RefreshCw,
  Smile,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Customer, GeneratedLookWithItems, OutfitItem, ReferencePhoto } from "@/lib/types";
import { lookImagePath } from "@/lib/lookImage";
import { FaceEditor } from "@/components/FaceEditor";

type CustomerData = {
  customer: Customer;
  referencePhotos: ReferencePhoto[];
  outfitItems: OutfitItem[];
  generatedLooks: GeneratedLookWithItems[];
};

function fileUrl(p: string | null) {
  return p ? `/api/files/${p}` : null;
}

const FETCH_STATUS_LABEL: Record<OutfitItem["fetch_status"], string> = {
  pending: "Pending",
  auto: "Auto-fetched",
  manual: "Manual upload",
  failed: "Needs image",
};

export default function CustomerWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<CustomerData | null>(null);
  const [outfitUrl, setOutfitUrl] = useState("");
  const [outfitCategory, setOutfitCategory] = useState("");
  const [addingOutfit, setAddingOutfit] = useState(false);
  const [selectedOutfitIds, setSelectedOutfitIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [creatingPpt, setCreatingPpt] = useState(false);
  const [faceEditorLookId, setFaceEditorLookId] = useState<string | null>(null);
  const [gettingShareLink, setGettingShareLink] = useState(false);
  const [copied, setCopied] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/customers/${id}`);
    if (res.ok) setData(await res.json());
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    load();
  }, [load]);

  async function handlePhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("files", f));
    await fetch(`/api/customers/${id}/photos`, { method: "POST", body: formData });
    load();
  }

  async function handleDeletePhoto(photoId: string) {
    await fetch(`/api/photos/${photoId}`, { method: "DELETE" });
    load();
  }

  async function handleAddOutfit(e: React.FormEvent) {
    e.preventDefault();
    if (!outfitUrl.trim()) return;
    setAddingOutfit(true);
    await fetch(`/api/customers/${id}/outfits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: outfitUrl, category: outfitCategory }),
    });
    setOutfitUrl("");
    setAddingOutfit(false);
    load();
  }

  async function handleCategoryChange(outfitId: string, category: string) {
    await fetch(`/api/outfits/${outfitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category }),
    });
    load();
  }

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

  async function handleManualOutfitImage(outfitId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    await fetch(`/api/outfits/${outfitId}/image`, { method: "POST", body: formData });
    load();
  }

  async function handleDeleteOutfit(outfitId: string) {
    await fetch(`/api/outfits/${outfitId}`, { method: "DELETE" });
    setSelectedOutfitIds((prev) => {
      if (!prev.has(outfitId)) return prev;
      const next = new Set(prev);
      next.delete(outfitId);
      return next;
    });
    load();
  }

  function toggleOutfitSelected(outfitId: string) {
    setSelectedOutfitIds((prev) => {
      const next = new Set(prev);
      if (next.has(outfitId)) next.delete(outfitId);
      else next.add(outfitId);
      return next;
    });
  }

  async function handleGenerateCombined() {
    if (selectedOutfitIds.size < 2) return;
    setGenerating(true);
    const res = await fetch(`/api/customers/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outfitItemIds: Array.from(selectedOutfitIds) }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      if (json.code === "AI_NOT_CONFIGURED") {
        alert("AI look generation is coming soon — check back once it's enabled.");
      } else {
        alert(json.error || "Generation failed");
      }
    } else {
      setSelectedOutfitIds(new Set());
    }
    setGenerating(false);
    load();
  }

  async function toggleSelected(lookId: string, selected: boolean) {
    await fetch(`/api/looks/${lookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected }),
    });
    load();
  }

  async function handleDeleteLook(lookId: string) {
    await fetch(`/api/looks/${lookId}`, { method: "DELETE" });
    load();
  }

  async function handleGetShareLink(regenerate: boolean) {
    setGettingShareLink(true);
    setCopied(false);
    await fetch(`/api/customers/${id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regenerate }),
    });
    setGettingShareLink(false);
    load();
  }

  function handleCopyShareLink(token: string) {
    const url = `${window.location.origin}/lb/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleFaceSaved(lookId: string, blob: Blob) {
    const formData = new FormData();
    formData.append("image", blob, "face-composite.png");
    await fetch(`/api/looks/${lookId}/face`, { method: "POST", body: formData });
    setFaceEditorLookId(null);
    load();
  }

  if (!data) {
    return (
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10 text-muted">Loading…</main>
    );
  }

  const { customer, referencePhotos, outfitItems, generatedLooks } = data;
  const outfitById = new Map(outfitItems.map((o) => [o.id, o]));
  const existingCategories = Array.from(
    new Set(outfitItems.map((o) => o.category).filter((c): c is string => !!c))
  );

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-10">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            Customers
          </Link>
          <h1 className="font-display text-3xl font-bold text-ink mt-1">{customer.name}</h1>
          {customer.contact && <p className="text-muted text-sm mt-0.5">{customer.contact}</p>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreatePpt}
            disabled={creatingPpt}
            className="inline-flex items-center gap-1.5 min-h-11 border border-line bg-surface rounded-lg px-4 py-2 font-semibold text-ink cursor-pointer transition-colors hover:border-ink/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creatingPpt ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <FileText size={16} aria-hidden="true" />
            )}
            {creatingPpt ? "Creating PPT…" : "Create PPT"}
          </button>
          <Link
            href={`/customers/${id}/lookbook`}
            className="inline-flex items-center gap-1.5 min-h-11 bg-ink text-cream rounded-lg px-4 py-2 font-semibold cursor-pointer transition-colors hover:bg-ink/90"
          >
            View lookbook
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Client share link */}
      <section className="mb-10 bg-surface border border-line rounded-2xl p-5">
        <h2 className="font-display text-sm font-bold text-ink mb-0.5">Share with client</h2>
        <p className="text-sm text-muted mb-3">
          A no-login link showing only the looks marked &quot;In lookbook&quot; — safe to send directly.
        </p>
        {customer.share_token ? (
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={`/lb/${customer.share_token}`}
              onFocus={(e) => e.target.select()}
              className="flex-1 min-w-[200px] border border-line rounded-lg px-3 py-2 text-sm text-muted bg-cream outline-none"
            />
            <button
              onClick={() => handleCopyShareLink(customer.share_token!)}
              className="inline-flex items-center gap-1.5 min-h-9 border border-line rounded-lg px-3 py-1.5 text-sm font-semibold text-ink cursor-pointer transition-colors hover:border-ink/40"
            >
              <Copy size={14} aria-hidden="true" />
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => handleGetShareLink(true)}
              disabled={gettingShareLink}
              title="Invalidates the current link and issues a new one"
              className="inline-flex items-center gap-1.5 min-h-9 text-sm font-medium text-muted cursor-pointer transition-colors hover:text-ink disabled:opacity-50"
            >
              <RefreshCw size={13} aria-hidden="true" className={gettingShareLink ? "animate-spin" : ""} />
              Regenerate
            </button>
          </div>
        ) : (
          <button
            onClick={() => handleGetShareLink(false)}
            disabled={gettingShareLink}
            className="inline-flex items-center gap-1.5 min-h-9 bg-ink text-cream rounded-lg px-3.5 py-1.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-50"
          >
            {gettingShareLink && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
            {gettingShareLink ? "Generating…" : "Generate share link"}
          </button>
        )}
        {customer.first_viewed_at ? (
          <p className="text-xs text-accent-hover font-medium mt-2.5">
            Client viewed this lookbook on{" "}
            {new Date(customer.first_viewed_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        ) : (
          customer.share_token && <p className="text-xs text-muted mt-2.5">Not viewed yet.</p>
        )}
      </section>

      {/* Reference photos */}
      <section className="mb-12">
        <h2 className="font-display text-lg font-bold text-ink mb-0.5">Reference photos</h2>
        <p className="text-sm text-muted mb-4">
          3–4 photos of the customer, used to generate every look.
        </p>
        <div className="flex flex-wrap gap-3">
          {referencePhotos.map((p) => (
            <div key={p.id} className="relative w-28 h-28 group">
              <img
                src={fileUrl(p.file_path)!}
                alt={`Reference photo of ${customer.name}`}
                className="w-full h-full object-cover rounded-xl border border-line"
              />
              <button
                onClick={() => handleDeletePhoto(p.id)}
                aria-label="Delete reference photo"
                className="absolute top-1.5 right-1.5 p-1 rounded-full bg-ink/70 text-cream cursor-pointer transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-700"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            onClick={() => photoInputRef.current?.click()}
            className="w-28 h-28 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-muted cursor-pointer transition-colors hover:border-accent hover:text-accent"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="text-xs font-semibold">Add photo</span>
          </button>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => handlePhotoUpload(e.target.files)}
          />
        </div>
        {referencePhotos.length === 0 && (
          <p className="text-sm text-amber-700 mt-3">
            Add at least one reference photo before generating looks.
          </p>
        )}
      </section>

      {/* Outfits */}
      <section>
        <h2 className="font-display text-lg font-bold text-ink mb-0.5">Outfits</h2>
        <p className="text-sm text-muted mb-4">
          Paste a product link, tag it with a category, then generate the look.
        </p>

        <form onSubmit={handleAddOutfit} className="flex flex-wrap gap-3 mb-7">
          <input
            value={outfitUrl}
            onChange={(e) => setOutfitUrl(e.target.value)}
            placeholder="Paste a Zara / Myntra / etc. product link"
            className="flex-1 min-w-[220px] border border-line rounded-lg px-3.5 py-2.5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          <input
            value={outfitCategory}
            onChange={(e) => setOutfitCategory(e.target.value)}
            placeholder="Category (e.g. Casuals)"
            list="category-suggestions"
            className="w-52 border border-line rounded-lg px-3.5 py-2.5 text-ink outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
          />
          <datalist id="category-suggestions">
            {existingCategories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <button
            type="submit"
            disabled={addingOutfit || !outfitUrl.trim()}
            className="inline-flex items-center gap-1.5 min-h-11 bg-ink text-cream rounded-lg px-4 py-2.5 font-semibold cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addingOutfit ? (
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            {addingOutfit ? "Adding…" : "Add outfit"}
          </button>
        </form>

        <div className="space-y-5">
          {outfitItems.map((outfit) => (
            <div
              key={outfit.id}
              className="bg-surface border border-line rounded-2xl p-5 transition-colors hover:border-ink/15"
            >
              <div className="flex gap-4">
                <label className="relative w-28 h-28 shrink-0 rounded-xl bg-cream border border-line flex items-center justify-center overflow-hidden cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedOutfitIds.has(outfit.id)}
                    disabled={!outfit.outfit_image_path}
                    onChange={() => toggleOutfitSelected(outfit.id)}
                    aria-label="Select for combined look"
                    className="absolute top-2 left-2 z-10 w-5 h-5 accent-accent cursor-pointer disabled:cursor-not-allowed"
                  />
                  {outfit.outfit_image_path ? (
                    <img
                      src={fileUrl(outfit.outfit_image_path)!}
                      alt="Outfit"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-muted text-center px-2">No image</span>
                  )}
                </label>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {outfit.source_url && (
                      <a
                        href={outfit.source_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-medium text-ink hover:text-accent transition-colors cursor-pointer"
                      >
                        {outfit.source_site || outfit.source_url}
                        <ExternalLink size={12} aria-hidden="true" />
                      </a>
                    )}
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        outfit.fetch_status === "failed"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-cream text-muted border border-line"
                      }`}
                    >
                      {FETCH_STATUS_LABEL[outfit.fetch_status]}
                    </span>
                  </div>

                  <input
                    defaultValue={outfit.category || ""}
                    onBlur={(e) => {
                      if (e.target.value !== (outfit.category || "")) {
                        handleCategoryChange(outfit.id, e.target.value);
                      }
                    }}
                    aria-label="Category"
                    placeholder="Category (e.g. Casuals)"
                    list="category-suggestions"
                    className="block text-xs font-medium border border-line rounded-md px-2.5 py-1.5 text-muted w-44 outline-none transition-shadow focus:ring-2 focus:ring-accent/40 focus:border-accent"
                  />

                  {outfit.fetch_status === "failed" && (
                    <p className="text-sm text-amber-700 mt-2">
                      Couldn&apos;t auto-fetch an image from this link — upload one manually.
                    </p>
                  )}

                  {!outfit.outfit_image_path && (
                    <label className="inline-flex items-center gap-1.5 mt-2.5 text-sm font-medium text-ink border border-line rounded-lg px-3 py-1.5 cursor-pointer transition-colors hover:border-accent hover:text-accent">
                      <Upload size={14} aria-hidden="true" />
                      Upload outfit photo
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleManualOutfitImage(outfit.id, file);
                        }}
                      />
                    </label>
                  )}

                  <div className="flex gap-4 mt-3.5">
                    <button
                      onClick={() => handleDeleteOutfit(outfit.id)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-red-700 cursor-pointer transition-colors hover:text-red-800"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {outfitItems.length === 0 && (
            <p className="text-muted text-sm">No outfits added yet.</p>
          )}
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 bg-ink text-cream rounded-xl px-4 py-3 shadow-lg mt-6">
          <span className="text-sm">
            {selectedOutfitIds.size >= 2
              ? `${selectedOutfitIds.size} items selected`
              : "Select 2 or more items to generate a combined look"}
          </span>
          <button
            onClick={handleGenerateCombined}
            disabled={selectedOutfitIds.size < 2 || generating || referencePhotos.length === 0}
            className="inline-flex items-center gap-1.5 min-h-9 bg-cream text-ink rounded-lg px-3.5 py-1.5 text-sm font-semibold cursor-pointer transition-colors hover:bg-cream/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles size={14} aria-hidden="true" />
            )}
            {generating ? "Generating…" : `Generate look${selectedOutfitIds.size >= 2 ? ` (${selectedOutfitIds.size})` : ""}`}
          </button>
        </div>
      </section>

      {/* Generated looks */}
      <section className="mt-12">
        <h2 className="font-display text-lg font-bold text-ink mb-0.5">Generated looks</h2>
        <p className="text-sm text-muted mb-4">Combined looks generated from your selected outfit items.</p>

        {generatedLooks.length === 0 ? (
          <p className="text-muted text-sm">No looks generated yet.</p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {generatedLooks.map((look) => {
              const contributingOutfits = look.outfitItemIds
                .map((oid) => outfitById.get(oid))
                .filter((o): o is OutfitItem => !!o);
              const caption = contributingOutfits
                .map((o) => o.source_site)
                .filter(Boolean)
                .join(" + ");
              return (
                <div key={look.id} className="w-40">
                  {look.status === "pending" && (
                    <div className="w-40 h-40 rounded-xl bg-cream border border-line flex items-center justify-center text-muted">
                      <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                    </div>
                  )}
                  {look.status === "failed" && (
                    <div className="w-40 h-40 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-xs text-red-700 text-center p-2">
                      {look.error || "Failed"}
                    </div>
                  )}
                  {look.status === "done" && lookImagePath(look) && (
                    <img
                      src={fileUrl(lookImagePath(look))!}
                      alt={`Generated look: ${customer.name} in ${caption || "an outfit"}`}
                      className="w-40 h-40 object-cover rounded-xl border border-line"
                    />
                  )}
                  {caption && <p className="text-xs text-muted mt-1.5 truncate">{caption}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    <button
                      onClick={() => toggleSelected(look.id, !look.selected_for_lookbook)}
                      disabled={look.status !== "done"}
                      aria-pressed={!!look.selected_for_lookbook}
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                        look.selected_for_lookbook
                          ? "bg-accent/15 text-accent-hover"
                          : "bg-cream text-muted border border-line hover:border-accent hover:text-accent"
                      }`}
                    >
                      {look.selected_for_lookbook && <Check size={12} aria-hidden="true" />}
                      In lookbook
                    </button>
                    <div className="flex items-center gap-1">
                      {!!look.client_loved && (
                        <span title="Client loved this look" className="p-1 text-red-500">
                          <Heart size={14} className="fill-current" aria-hidden="true" />
                        </span>
                      )}
                      <button
                        onClick={() => setFaceEditorLookId(look.id)}
                        disabled={look.status !== "done" || referencePhotos.length === 0}
                        aria-label={look.final_image_path ? "Redo face" : "Add face"}
                        title={look.final_image_path ? "Redo face" : "Add face"}
                        className="p-1 text-muted cursor-pointer transition-colors hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Smile size={14} aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => handleDeleteLook(look.id)}
                        aria-label="Delete generated look"
                        className="p-1 text-muted cursor-pointer transition-colors hover:text-red-700"
                      >
                        <X size={14} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {faceEditorLookId &&
        (() => {
          const look = generatedLooks.find((l) => l.id === faceEditorLookId);
          if (!look || !look.image_path) return null;
          return (
            <FaceEditor
              lookImageUrl={fileUrl(look.image_path)!}
              referencePhotos={referencePhotos}
              fileUrl={fileUrl}
              onCancel={() => setFaceEditorLookId(null)}
              onSave={(blob) => handleFaceSaved(look.id, blob)}
            />
          );
        })()}
    </main>
  );
}
