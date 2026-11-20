"use client";

import { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <Button type="button" variant="secondary" size="sm" onClick={handleShare}>
      {copied ? (
        <>
          <Check className="size-4 text-success-600" />
          <span>Copié !</span>
        </>
      ) : (
        <>
          <Share2 className="size-4" />
          <span>Partager le récapitulatif</span>
        </>
      )}
    </Button>
  );
}
