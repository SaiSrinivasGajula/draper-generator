"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, RotateCw, X } from "lucide-react";
import type { ReferencePhoto } from "@/lib/types";

type Stage = "pick" | "crop" | "place";

type DragState =
  | { type: "move-circle"; startPointer: { x: number; y: number }; start: { x: number; y: number } }
  | {
      type: "resize-circle";
      startPointer: { x: number; y: number };
      start: { centerClientX: number; centerClientY: number };
    }
  | { type: "move-cutout"; startPointer: { x: number; y: number }; start: { x: number; y: number } }
  | {
      type: "resize-cutout";
      startPointer: { x: number; y: number };
      start: { centerClientX: number; centerClientY: number };
    }
  | {
      type: "rotate-cutout";
      startPointer: { x: number; y: number };
      start: { centerClientX: number; centerClientY: number };
    };

const DISPLAY_MAX_H = 420;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function FaceEditor({
  lookImageUrl,
  referencePhotos,
  fileUrl,
  onCancel,
  onSave,
}: {
  lookImageUrl: string;
  referencePhotos: ReferencePhoto[];
  fileUrl: (p: string | null) => string | null;
  onCancel: () => void;
  onSave: (blob: Blob) => Promise<void> | void;
}) {
  const [stage, setStage] = useState<Stage>("pick");
  const [saving, setSaving] = useState(false);

  // Crop stage
  const [refImg, setRefImg] = useState<HTMLImageElement | null>(null);
  const [refDisplayW, setRefDisplayW] = useState(0);
  const [refDisplayH, setRefDisplayH] = useState(0);
  const [circle, setCircle] = useState({ x: 0, y: 0, r: 60 });
  const cropContainerRef = useRef<HTMLDivElement>(null);

  // Place stage
  const [lookImg, setLookImg] = useState<HTMLImageElement | null>(null);
  const [lookDisplayW, setLookDisplayW] = useState(0);
  const [lookDisplayH, setLookDisplayH] = useState(0);
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);
  const [cutoutImg, setCutoutImg] = useState<HTMLImageElement | null>(null);
  const [placement, setPlacement] = useState({ x: 0, y: 0, size: 120, rotation: 0 });
  const placeContainerRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadImage(lookImageUrl).then((img) => {
      if (cancelled) return;
      setLookImg(img);
      const scale = Math.min(1, DISPLAY_MAX_H / img.naturalHeight);
      setLookDisplayW(img.naturalWidth * scale);
      setLookDisplayH(img.naturalHeight * scale);
    });
    return () => {
      cancelled = true;
    };
  }, [lookImageUrl]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startPointer.x;
      const dy = e.clientY - drag.startPointer.y;

      if (drag.type === "move-circle") {
        setCircle((c) => ({ ...c, x: drag.start.x + dx, y: drag.start.y + dy }));
      } else if (drag.type === "resize-circle") {
        const dist = Math.hypot(e.clientX - drag.start.centerClientX, e.clientY - drag.start.centerClientY);
        setCircle((c) => ({ ...c, r: Math.max(16, dist) }));
      } else if (drag.type === "move-cutout") {
        setPlacement((p) => ({ ...p, x: drag.start.x + dx, y: drag.start.y + dy }));
      } else if (drag.type === "resize-cutout") {
        const dist = Math.hypot(e.clientX - drag.start.centerClientX, e.clientY - drag.start.centerClientY);
        setPlacement((p) => ({ ...p, size: Math.max(24, dist * 2) }));
      } else if (drag.type === "rotate-cutout") {
        const angle = Math.atan2(e.clientY - drag.start.centerClientY, e.clientX - drag.start.centerClientX);
        setPlacement((p) => ({ ...p, rotation: (angle * 180) / Math.PI + 90 }));
      }
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  function startDrag(type: DragState["type"], e: React.PointerEvent, start: DragState["start"]) {
    e.preventDefault();
    e.stopPropagation();
    dragRef.current = { type, startPointer: { x: e.clientX, y: e.clientY }, start } as DragState;
  }

  async function pickReferencePhoto(photo: ReferencePhoto) {
    const url = fileUrl(photo.file_path)!;
    const img = await loadImage(url);
    setRefImg(img);
    const scale = Math.min(1, DISPLAY_MAX_H / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    setRefDisplayW(w);
    setRefDisplayH(h);
    const r = Math.min(w, h) * 0.28;
    setCircle({ x: w / 2, y: h / 2.6, r });
    setStage("crop");
  }

  async function confirmCrop() {
    if (!refImg) return;
    const scaleToNatural = refImg.naturalWidth / refDisplayW;
    const nx = circle.x * scaleToNatural;
    const ny = circle.y * scaleToNatural;
    const nr = circle.r * scaleToNatural;
    const size = Math.max(1, Math.round(nr * 2));

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(refImg, nx - nr, ny - nr, size, size, 0, 0, size, size);
    ctx.restore();

    const url = canvas.toDataURL("image/png");
    const img = await loadImage(url);
    setCutoutUrl(url);
    setCutoutImg(img);
    setPlacement({
      x: lookDisplayW / 2,
      y: lookDisplayH * 0.14,
      size: Math.min(lookDisplayW, lookDisplayH) * 0.34,
      rotation: 0,
    });
    setStage("place");
  }

  async function handleSave() {
    if (!lookImg || !cutoutImg) return;
    setSaving(true);
    try {
      const scaleFactor = lookImg.naturalWidth / lookDisplayW;
      const canvas = document.createElement("canvas");
      canvas.width = lookImg.naturalWidth;
      canvas.height = lookImg.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(lookImg, 0, 0, canvas.width, canvas.height);

      const drawSize = placement.size * scaleFactor;
      ctx.save();
      ctx.translate(placement.x * scaleFactor, placement.y * scaleFactor);
      ctx.rotate((placement.rotation * Math.PI) / 180);
      ctx.drawImage(cutoutImg, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();

      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png")
      );
      await onSave(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add face to generated look"
    >
      <div className="bg-cream rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-ink">Add face</h3>
          <button
            onClick={onCancel}
            aria-label="Close"
            className="p-1 text-muted cursor-pointer transition-colors hover:text-ink"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {stage === "pick" && (
          <>
            <p className="text-sm text-muted mb-4">
              Pick one of this customer&apos;s reference photos to cut the head from.
            </p>
            <div className="flex flex-wrap gap-3">
              {referencePhotos.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickReferencePhoto(p)}
                  className="w-24 h-24 rounded-xl overflow-hidden border border-line cursor-pointer transition-colors hover:border-accent"
                >
                  <img
                    src={fileUrl(p.file_path)!}
                    alt="Reference"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
            {referencePhotos.length === 0 && (
              <p className="text-sm text-amber-700">No reference photos to choose from yet.</p>
            )}
          </>
        )}

        {stage === "crop" && refImg && (
          <>
            <p className="text-sm text-muted mb-3">
              Drag the circle over the head, use the dot to resize it.
            </p>
            <div
              ref={cropContainerRef}
              className="relative mx-auto touch-none select-none rounded-xl overflow-hidden border border-line"
              style={{ width: refDisplayW, height: refDisplayH }}
            >
              <img
                src={refImg.src}
                alt="Reference"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              />
              <div
                className="absolute rounded-full border-2 border-accent bg-accent/10 cursor-move"
                style={{
                  left: circle.x - circle.r,
                  top: circle.y - circle.r,
                  width: circle.r * 2,
                  height: circle.r * 2,
                }}
                onPointerDown={(e) => startDrag("move-circle", e, { x: circle.x, y: circle.y })}
              >
                <div
                  className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-accent border-2 border-cream cursor-nwse-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = cropContainerRef.current!.getBoundingClientRect();
                    startDrag("resize-circle", e, {
                      centerClientX: rect.left + circle.x,
                      centerClientY: rect.top + circle.y,
                    });
                  }}
                />
              </div>
            </div>
            <div className="flex justify-between gap-3 mt-5">
              <button
                onClick={() => setStage("pick")}
                className="text-sm font-medium text-muted cursor-pointer transition-colors hover:text-ink"
              >
                Back
              </button>
              <button
                onClick={confirmCrop}
                className="inline-flex items-center gap-1.5 min-h-9 bg-ink text-cream rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-ink/90"
              >
                Use this crop
              </button>
            </div>
          </>
        )}

        {stage === "place" && lookImg && cutoutUrl && (
          <>
            <p className="text-sm text-muted mb-3">
              Drag to position the head, bottom dot resizes, top dot rotates.
            </p>
            <div
              ref={placeContainerRef}
              className="relative mx-auto touch-none select-none rounded-xl overflow-hidden border border-line bg-cream"
              style={{ width: lookDisplayW, height: lookDisplayH }}
            >
              <img
                src={lookImg.src}
                alt="Generated look"
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              />
              <div
                className="absolute cursor-move"
                style={{
                  left: placement.x - placement.size / 2,
                  top: placement.y - placement.size / 2,
                  width: placement.size,
                  height: placement.size,
                  transform: `rotate(${placement.rotation}deg)`,
                }}
                onPointerDown={(e) => startDrag("move-cutout", e, { x: placement.x, y: placement.y })}
              >
                <img
                  src={cutoutUrl}
                  alt="Face cutout"
                  draggable={false}
                  className="w-full h-full pointer-events-none select-none"
                />
                <div
                  className="absolute -right-2 -bottom-2 w-5 h-5 rounded-full bg-accent border-2 border-cream cursor-nwse-resize"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = placeContainerRef.current!.getBoundingClientRect();
                    startDrag("resize-cutout", e, {
                      centerClientX: rect.left + placement.x,
                      centerClientY: rect.top + placement.y,
                    });
                  }}
                />
                <div
                  className="absolute left-1/2 -top-7 -translate-x-1/2 w-5 h-5 rounded-full bg-accent border-2 border-cream cursor-grab flex items-center justify-center"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const rect = placeContainerRef.current!.getBoundingClientRect();
                    startDrag("rotate-cutout", e, {
                      centerClientX: rect.left + placement.x,
                      centerClientY: rect.top + placement.y,
                    });
                  }}
                >
                  <RotateCw size={12} className="text-cream" aria-hidden="true" />
                </div>
              </div>
            </div>
            <div className="flex justify-between gap-3 mt-5">
              <button
                onClick={() => setStage("crop")}
                className="text-sm font-medium text-muted cursor-pointer transition-colors hover:text-ink"
              >
                Recrop
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  className="text-sm font-medium text-muted cursor-pointer transition-colors hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 min-h-9 bg-ink text-cream rounded-lg px-4 py-2 text-sm font-semibold cursor-pointer transition-colors hover:bg-ink/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
