"use client";

import { useState, useTransition } from "react";
import { MessageCircle, Check, AlertCircle, ExternalLink } from "lucide-react";
import { setPlatformSettingAction } from "./actions";
import { Spinner } from "@/components/ui/spinner";

export function AdminPlatformSettingsCard({
  initialWhatsappUrl,
}: {
  initialWhatsappUrl: string;
}) {
  const [whatsappUrl, setWhatsappUrl] = useState(initialWhatsappUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [, startTransition] = useTransition();

  function handleSave() {
    setIsSaving(true);
    setMessage(null);

    startTransition(async () => {
      const res = await setPlatformSettingAction("community_whatsapp_url", whatsappUrl);
      setIsSaving(false);
      if (res.ok) {
        setMessage({
          success: true,
          text: "Lien de la communauté WhatsApp mis à jour avec succès !",
        });
      } else {
        setMessage({
          success: false,
          text: res.error || "Erreur lors de l'enregistrement du réglage.",
        });
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <MessageCircle className="size-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-ink">Communauté WhatsApp de la Plateforme</h2>
            <p className="text-xs text-muted">
              Lien d&apos;invitation au groupe ou canal WhatsApp officiel pour les commerçants et clients.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="community-whatsapp" className="block text-xs font-bold text-ink">
          Lien d&apos;invitation WhatsApp (URL complète)
        </label>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <input
            id="community-whatsapp"
            type="url"
            placeholder="https://chat.whatsapp.com/..."
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value)}
            className="h-10 flex-1 rounded-xl border border-line bg-white px-3.5 text-xs text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 font-mono"
          />

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink px-4 text-xs font-bold text-white hover:bg-black transition-colors cursor-pointer disabled:opacity-60 shrink-0"
          >
            {isSaving ? <Spinner className="size-3.5 text-white" /> : <span>Enregistrer le lien</span>}
          </button>
        </div>

        <p className="text-[11px] text-muted">
          Règle : si ce champ est vide, le bouton Communauté WhatsApp n&apos;apparaît nulle part.
          S&apos;il est renseigné, le bouton apparaît pour tous les commerçants (menu latéral desktop et mobile)
          et dans l&apos;espace client, ouvrant le lien dans un nouvel onglet.
        </p>

        {whatsappUrl.trim() && (
          <div className="pt-1">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
            >
              <ExternalLink className="size-3" />
              <span>Tester le lien d&apos;invitation</span>
            </a>
          </div>
        )}

        {message && (
          <div
            className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl p-3 ${
              message.success
                ? "bg-success-50 text-success-700 border border-success-200"
                : "bg-danger-50 text-danger-700 border border-danger-200"
            }`}
          >
            {message.success ? (
              <Check className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}
