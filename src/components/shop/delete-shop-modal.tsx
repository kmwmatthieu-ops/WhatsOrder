"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { deleteShop } from "@/app/tableau-de-bord/parametres/actions";
import { Spinner } from "@/components/ui/spinner";
import { Alert } from "@/components/ui/alert";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  redirectUrl?: string;
};

export function DeleteShopModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  redirectUrl = "/onboarding",
}: Props) {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isConfirmed = confirmationInput.trim().toLowerCase() === shopName.trim().toLowerCase();

  async function handleDelete() {
    if (!isConfirmed || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await deleteShop(shopId, confirmationInput);
      if (res.error) {
        setError(res.error);
        setLoading(false);
        return;
      }

      // Nettoyage des brouillons locaux pour repartir sur une nouvelle boutique propre
      try {
        localStorage.removeItem("wo-onboarding-draft");
        localStorage.removeItem("wo-onboarding-in-progress");
      } catch {
        // ignore
      }

      // Redirection immédiate
      window.location.replace(redirectUrl);
    } catch {
      setError("Une erreur inattendue est survenue lors de la suppression.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-line bg-white p-5 sm:p-6 pb-8 sm:pb-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-danger-100 text-danger-700">
              <AlertTriangle className="size-4 sm:size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-ink truncate">Supprimer la boutique</h2>
              <p className="text-[11px] sm:text-xs text-muted truncate">Action définitive et irréversible</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full p-2 text-muted hover:bg-sand transition-colors shrink-0"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {/* Message d'avertissement */}
        <div className="rounded-2xl border border-danger-200 bg-danger-50/60 p-3.5 text-xs text-danger-800 leading-relaxed flex flex-col gap-1.5">
          <p className="font-bold">Attention :</p>
          <p>
            Toutes les données de cette boutique (produits, variantes, catégories, clients, commandes et règlements)
            seront définitivement supprimées.
          </p>
          <p className="text-danger-900 font-semibold pt-1 border-t border-danger-200/50">
            Votre compte utilisateur reste actif et vous pourrez immédiatement créer une nouvelle boutique.
          </p>
        </div>

        {/* Zone de confirmation */}
        <div className="flex flex-col gap-2">
          <label htmlFor="confirm-shop-name" className="text-xs font-semibold text-ink leading-relaxed">
            Veuillez taper <strong className="font-bold select-all text-danger-700">« {shopName} »</strong> pour confirmer :
          </label>
          <input
            id="confirm-shop-name"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            disabled={loading}
            placeholder={shopName}
            className="w-full rounded-2xl border border-line bg-sand/30 px-3.5 py-3 text-sm font-medium text-ink focus:border-danger-500 focus:outline-none focus:ring-2 focus:ring-danger-500/20"
            autoComplete="off"
            autoFocus
          />
        </div>

        {/* Boutons d'action */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto h-11 sm:h-10 px-4 rounded-xl border border-line text-xs sm:text-sm font-semibold text-muted hover:bg-sand transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
            className="w-full sm:w-auto h-11 sm:h-10 px-5 inline-flex items-center justify-center gap-2 rounded-xl bg-danger-600 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-danger-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? <Spinner /> : <Trash2 className="size-4 shrink-0" />}
            <span>Supprimer définitivement</span>
          </button>
        </div>
      </div>
    </div>
  );
}
