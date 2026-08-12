"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Heart, MessageCircle, Share2 } from "lucide-react";

export type PublicLook = {
  id: string;
  imageUrl: string | null;
  loved: boolean;
  category: string;
  outfits: { sourceSite: string | null; sourceUrl: string | null }[];
};

type DragState = { startX: number };

export function LookbookCarousel({
  token,
  firstName,
  looks,
  stylistWhatsapp,
  stylistName,
}: {
  token: string;
  firstName: string;
  looks: PublicLook[];
  stylistWhatsapp: string;
  stylistName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [loved, setLoved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(looks.map((l) => [l.id, l.loved]))
  );
  const [trackWidth, setTrackWidth] = useState(0);
  const dragRef = useRef<DragState | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  function goTo(index: number) {
    setActiveIndex(Math.max(0, Math.min(looks.length - 1, index)));
  }

  useEffect(() => {
    function measure() {
      setTrackWidth(trackRef.current?.clientWidth || 0);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goTo(activeIndex - 1);
      if (e.key === "ArrowRight") goTo(activeIndex + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo reads latest activeIndex via closure each keydown
  }, [activeIndex, looks.length]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      setDragOffset(e.clientX - dragRef.current.startX);
    }
    function onUp() {
      if (!dragRef.current) return;
      const width = trackRef.current?.clientWidth || window.innerWidth;
      const threshold = width * 0.18;
      setDragOffset((offset) => {
        if (offset < -threshold) goTo(activeIndex + 1);
        else if (offset > threshold) goTo(activeIndex - 1);
        return 0;
      });
      dragRef.current = null;
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo reads latest activeIndex via closure on release
  }, [activeIndex]);

  async function toggleLove(lookId: string) {
    const next = !loved[lookId];
    setLoved((prev) => ({ ...prev, [lookId]: next }));
    try {
      await fetch(`/api/public/lookbook/${token}/looks/${lookId}/love`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loved: next }),
      });
    } catch {
      setLoved((prev) => ({ ...prev, [lookId]: !next }));
    }
  }

  async function handleShare() {
    const url = window.location.href;
    const shareData = { title: `${firstName}'s Lookbook — Draper Society`, url };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // user cancelled — no-op
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, "_blank");
    }
  }

  const active = looks[activeIndex];
  const dragPercentOfTrack = trackWidth ? (dragOffset / trackWidth) * 100 : 0;
  const translatePercent = -((activeIndex * 100) / looks.length) + dragPercentOfTrack;

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-ink">
      {/* Progress segments */}
      <div className="absolute top-0 inset-x-0 z-30 flex gap-1 px-3 pt-3">
        {looks.map((l, i) => (
          <div key={l.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: i <= activeIndex ? "100%" : "0%" }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 inset-x-0 z-30 flex items-center justify-between px-4">
        <p className="text-cream/90 text-sm font-medium">
          Hi {firstName} <span aria-hidden="true">👋</span>
        </p>
        <button
          onClick={handleShare}
          aria-label="Share this lookbook"
          className="p-2 rounded-full bg-black/40 text-cream cursor-pointer backdrop-blur-sm shadow-sm transition-colors hover:bg-black/60"
        >
          <Share2 size={16} aria-hidden="true" />
        </button>
      </div>

      {/* Slide track */}
      <div
        ref={trackRef}
        className="flex h-full touch-none select-none"
        style={{
          width: `${looks.length * 100}%`,
          transform: `translateX(${translatePercent}%)`,
          transition: dragging ? "none" : "transform 300ms ease-out",
        }}
        onPointerDown={(e) => {
          dragRef.current = { startX: e.clientX };
          setDragging(true);
        }}
      >
        {looks.map((look) => (
          <div key={look.id} className="relative h-full shrink-0" style={{ width: `${100 / looks.length}%` }}>
            {look.imageUrl && (
              <img
                src={look.imageUrl}
                alt={`${firstName} wearing an outfit from ${look.outfits.map((o) => o.sourceSite).filter(Boolean).join(" + ") || "the lookbook"}`}
                draggable={false}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
              />
            )}
            <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/90 via-ink/40 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>

      {/* Tap zones */}
      <button
        aria-label="Previous look"
        onClick={() => goTo(activeIndex - 1)}
        disabled={activeIndex === 0}
        className="absolute left-0 top-24 bottom-24 z-10 w-1/4 cursor-pointer disabled:cursor-default"
      />
      <button
        aria-label="Next look"
        onClick={() => goTo(activeIndex + 1)}
        disabled={activeIndex === looks.length - 1}
        className="absolute right-0 top-24 bottom-24 z-10 w-1/4 cursor-pointer disabled:cursor-default"
      />
      {activeIndex > 0 && (
        <ChevronLeft
          size={22}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-cream/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] pointer-events-none"
          aria-hidden="true"
        />
      )}
      {activeIndex < looks.length - 1 && (
        <ChevronRight
          size={22}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-cream/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] pointer-events-none"
          aria-hidden="true"
        />
      )}

      {/* Heart */}
      {active && (
        <button
          onClick={() => toggleLove(active.id)}
          aria-pressed={loved[active.id]}
          aria-label={loved[active.id] ? "Unlove this look" : "Love this look"}
          className="absolute top-24 right-4 z-30 p-3 rounded-full bg-black/40 backdrop-blur-sm shadow-sm cursor-pointer transition-colors hover:bg-black/60"
        >
          <Heart
            size={20}
            className={loved[active.id] ? "fill-red-500 text-red-500" : "text-cream"}
            aria-hidden="true"
          />
        </button>
      )}

      {/* Category label */}
      {active && (
        <p className="absolute bottom-28 inset-x-0 z-20 text-center font-display font-bold text-cream text-lg tracking-wide px-6">
          {active.category}
        </p>
      )}

      {/* Shop this look */}
      {active && active.outfits.some((o) => o.sourceUrl) && (
        <div className="absolute bottom-14 inset-x-0 z-20 flex gap-2 px-4 overflow-x-auto no-scrollbar">
          {active.outfits.map((o, i) =>
            o.sourceUrl ? (
              <a
                key={i}
                href={o.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold bg-cream text-ink rounded-full px-3 py-1.5 cursor-pointer transition-colors hover:bg-cream/90"
              >
                {o.sourceSite || "Shop this piece"}
                <ExternalLink size={11} aria-hidden="true" />
              </a>
            ) : null
          )}
        </div>
      )}

      {/* Message your stylist */}
      {stylistWhatsapp && (
        <a
          href={`https://wa.me/${stylistWhatsapp}?text=${encodeURIComponent("Hi! I have a question about my lookbook.")}`}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-4 left-4 z-30 inline-flex items-center gap-1.5 text-xs font-semibold bg-black/40 text-cream rounded-full px-3 py-2 backdrop-blur-sm shadow-sm cursor-pointer transition-colors hover:bg-black/60"
        >
          <MessageCircle size={13} aria-hidden="true" />
          Message {stylistName || "your stylist"}
        </a>
      )}
    </div>
  );
}
