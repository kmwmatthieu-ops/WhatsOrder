"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

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
    <div className="rounded-3xl border-2 border-[#25D366] bg-[#25D366]/5 p-4 sm:p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[#25D366] text-white shadow-sm">
          <WhatsAppIcon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-extrabold text-ink leading-snug">
            Étape finale : Envoyez sur WhatsApp
          </h2>
          <p className="mt-0.5 text-xs text-muted leading-relaxed">
            Pour valider la préparation, transmettez votre commande directement à {shopName}.
          </p>
        </div>
      </div>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-4 py-3 text-xs sm:text-sm font-extrabold text-white shadow-md hover:bg-[#20ba59] active:scale-98 transition-all"
      >
        <WhatsAppIcon className="size-5 shrink-0" />
        <span className="truncate">Envoyer ma commande sur WhatsApp</span>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
      >
        {copied ? (
          <>
            <Check className="size-3.5 shrink-0 text-success-600" />
            <span className="text-success-600 font-bold">Message copié dans le presse-papiers !</span>
          </>
        ) : (
          <>
            <Copy className="size-3.5 shrink-0" />
            <span>Copier le texte du message si WhatsApp ne s&apos;ouvre pas</span>
          </>
        )}
      </button>
    </div>
  );
}
