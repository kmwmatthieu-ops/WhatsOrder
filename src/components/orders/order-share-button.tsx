"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function OrderShareButton({ summaryText }: { summaryText: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Récapitulatif de commande",
          text: summaryText,
        });
        return;
      } catch {
        /* share annulé */
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-2xs hover:bg-sand active:scale-95 transition-all whitespace-nowrap cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="size-3.5 shrink-0 text-success-600" />
          <span className="text-success-700">Copié !</span>
        </>
      ) : (
        <>
          <Share2 className="size-3.5 shrink-0 text-brand-600" />
          <span className="sm:hidden">Partager</span>
          <span className="hidden sm:inline">Partager le récapitulatif</span>
        </>
      )}
    </button>
  );
}
