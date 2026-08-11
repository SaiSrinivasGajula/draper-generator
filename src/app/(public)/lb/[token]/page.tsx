"use client";

import { use, useEffect, useState } from "react";
import { LookbookCarousel, type PublicLook } from "@/components/LookbookCarousel";
import { STYLIST_WHATSAPP_NUMBER, STYLIST_DISPLAY_NAME } from "@/lib/config";

type PublicLookbookData = {
  firstName: string;
  looks: PublicLook[];
};

export default function PublicLookbookPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<PublicLookbookData | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/lookbook/${token}`)
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setData(await res.json());
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (notFound) {
    return (
      <main className="h-dvh flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-accent mb-3">DRAPER SOCIETY</p>
          <h1 className="font-display text-2xl font-bold mb-2">This link isn&apos;t valid</h1>
          <p className="text-cream/70 text-sm">
            It may have been regenerated. Ask your stylist for a fresh link.
          </p>
        </div>
      </main>
    );
  }

  if (!data) {
    return <main className="h-dvh flex items-center justify-center text-cream/60 text-sm">Loading…</main>;
  }

  if (data.looks.length === 0) {
    return (
      <main className="h-dvh flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-xs font-semibold tracking-[0.25em] text-accent mb-3">DRAPER SOCIETY</p>
          <h1 className="font-display text-2xl font-bold mb-2">Hi {data.firstName} 👋</h1>
          <p className="text-cream/70 text-sm">
            Your lookbook is being curated — check back soon.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <LookbookCarousel
        token={token}
        firstName={data.firstName}
        looks={data.looks}
        stylistWhatsapp={STYLIST_WHATSAPP_NUMBER}
        stylistName={STYLIST_DISPLAY_NAME}
      />
    </main>
  );
}
