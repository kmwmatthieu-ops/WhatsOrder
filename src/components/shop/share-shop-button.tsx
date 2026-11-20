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
    <div className="flex gap-2">
      <Button type="button" onClick={share} className="flex-1">
        <Share2 className="size-5" aria-hidden />
        Partager ma boutique
      </Button>
      <Button type="button" variant="secondary" onClick={copy} aria-label="Copier le lien" className="w-12 px-0">
        {copied ? <Check className="size-5 text-success-600" /> : <Copy className="size-5" />}
      </Button>
    </div>
  );
}
