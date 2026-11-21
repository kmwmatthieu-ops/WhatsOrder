"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Partage du lien de la boutique : feuille de partage native du téléphone
 * (WhatsApp, Instagram…) si disponible, sinon ouverture de WhatsApp.
 */
export function ShareShopButton({ url, shopName }: { url: string; shopName: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Découvrez ma boutique ${shopName} et commandez directement ici 👇\n${url}`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: shopName, text, url });
        return;
      } catch {
        return; // partage annulé par l'utilisateur
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* presse-papiers indisponible (http, ancien navigateur) */
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      <Button type="button" onClick={share} className="flex-1 h-12 text-sm sm:text-base">
        <Share2 className="size-5 shrink-0" aria-hidden />
        <span>Partager ma boutique</span>
      </Button>
      <button
        type="button"
        onClick={copy}
        title={copied ? "Lien copié !" : "Copier le lien"}
        aria-label={copied ? "Lien copié dans le presse-papiers" : "Copier le lien de la boutique"}
        className={`size-12 shrink-0 flex items-center justify-center rounded-2xl border transition-all active:scale-95 ${
          copied
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 shadow-xs"
            : "border-line bg-white text-ink hover:bg-sand/70 hover:border-brand-500 shadow-xs"
        }`}
      >
        {copied ? (
          <Check className="size-6 sm:size-7 text-emerald-600 stroke-[2.5]" />
        ) : (
          <Copy className="size-6 sm:size-7 text-ink stroke-[2.2]" />
        )}
      </button>
    </div>
  );
}
