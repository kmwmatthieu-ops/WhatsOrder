"use client";

import { useState } from "react";
import { MessageCircle, Copy, Check } from "lucide-react";

export function WhatsAppSendCard({
  whatsappUrl,
  messageText,
  shopName,
}: {
  whatsappUrl: string;
  messageText: string;
  shopName: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-3xl border-2 border-[#25D366] bg-[#25D366]/5 p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#25D366] text-white shadow-sm">
          <MessageCircle className="size-6" />
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-ink">Étape finale : Envoyez sur WhatsApp</h2>
          <p className="text-xs text-muted leading-relaxed">
            Pour valider la préparation, transmettez votre commande directement à {shopName}.
          </p>
        </div>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-extrabold text-white shadow-md hover:bg-[#20ba59] active:scale-98 transition-all"
      >
        <MessageCircle className="size-5" />
        <span>Envoyer ma commande sur WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-success-600" />
            <span className="text-success-600 font-bold">Message copié dans le presse-papiers !</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5" />
            <span>Copier le texte du message si WhatsApp ne s&apos;ouvre pas</span>
          </>
        )}
      </button>
    </div>
  );
}
