"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShopQrCodeModal } from "./shop-qr-code-modal";

/**
 * Partage du lien de la boutique : feuille de partage native du téléphone
 * (WhatsApp, Instagram…) si disponible, sinon ouverture de WhatsApp.
 * Inclut également la copie de lien et l'affichage/téléchargement du QR Code officiel.
 */
export function ShareShopButton({
  url,
  shopName,
  shopSlug,
}: {
  url: string;
  shopName: string;
  shopSlug?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = `Découvrez ma boutique ${shopName} et commandez directement ici 👇\n${url}`;
  const slug = shopSlug || url.split("/").filter(Boolean).pop() || "ma-boutique";

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
    <div className="flex items-center gap-2 sm:gap-2.5">
      <Button type="button" onClick={share} className="flex-1 h-12 text-xs sm:text-sm font-bold">
        <Share2 className="size-4 sm:size-5 shrink-0" aria-hidden />
        <span>Partager ma boutique</span>
      </Button>

      {/* Bouton Générateur de QR Code */}
      <ShopQrCodeModal url={url} shopName={shopName} shopSlug={slug} />

      {/* Bouton Copier le lien */}
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
          <Check className="size-5 sm:size-6 text-emerald-600 stroke-[2.5]" />
        ) : (
          <Copy className="size-5 sm:size-6 text-ink stroke-[2.2]" />
        )}
      </button>
    </div>
  );
}
