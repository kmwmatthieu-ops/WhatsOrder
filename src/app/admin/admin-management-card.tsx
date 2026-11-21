"use client";

import { useState } from "react";
import { ShieldCheck, UserPlus, Trash2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { addAdminAction, removeAdminAction } from "./actions";

export type AdminUserRow = {
  user_id: string;
  email: string;
  created_at: string;
};

export function AdminManagementCard({
  admins,
  currentUserId,
}: {
  admins: AdminUserRow[];
  currentUserId: string;
}) {
  const [newEmail, setNewEmail] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isMaxReached = admins.length >= 2;

  async function handleAddAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || isAdding) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsAdding(true);

    try {
      const res = await addAdminAction(newEmail);
      if (!res.ok) {
        setErrorMsg(res.error || "Impossible d'ajouter cet administrateur.");
      } else {
        setSuccessMsg(`L'adresse ${newEmail} a été promue administrateur avec succès.`);
        setNewEmail("");
      }
    } catch {
      setErrorMsg("Une erreur imprévue est survenue.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleRemoveAdmin(userId: string, email: string) {
    if (admins.length <= 1) {
      alert("Impossible de supprimer le dernier compte administrateur.");
      return;
    }

    const confirmMsg =
      userId === currentUserId
        ? `Êtes-vous sûr de vouloir révoquer vos propres accès administrateur (${email}) ? Vous serez immédiatement déconnecté de l'espace admin.`
        : `Voulez-vous vraiment révoquer les accès administrateur de ${email} ?`;

    if (!confirm(confirmMsg)) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setDeletingId(userId);

    try {
      const res = await removeAdminAction(userId);
      if (!res.ok) {
        setErrorMsg(res.error || "Erreur lors de la suppression.");
      } else {
        setSuccessMsg(`L'accès administrateur de ${email} a été révoqué.`);
      }
    } catch {
      setErrorMsg("Une erreur imprévue est survenue.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs space-y-6">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-black text-white shrink-0">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-ink">Comptes Administrateurs</h2>
              <span className="rounded-full bg-sand px-2.5 py-0.5 text-[11px] font-bold text-ink border border-line">
                {admins.length} / 2 autorisés
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Gérez les 2 accès stricts à ce panneau d&apos;administration.
            </p>
          </div>
        </div>
      </div>

      {/* Messages de statut */}
      {errorMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-danger-200 bg-danger-50 p-3.5 text-xs font-semibold text-danger-800">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-success-200 bg-success-50 p-3.5 text-xs font-semibold text-success-800">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Liste des administrateurs actifs */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
          Administrateurs actuels ({admins.length})
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {admins.map((admin) => {
            const isMe = admin.user_id === currentUserId;
            const isDeleting = deletingId === admin.user_id;

            return (
              <div
                key={admin.user_id}
                className={`flex items-center justify-between rounded-2xl border p-4 transition-all ${
                  isMe
                    ? "border-brand-500/40 bg-brand-50/20"
                    : "border-line bg-sand/20 hover:bg-white"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm text-ink truncate">{admin.email}</p>
                    {isMe && (
                      <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
                        Vous
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted mt-0.5">
                    Actif depuis le{" "}
                    {new Date(admin.created_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={admins.length <= 1 || isDeleting}
                  onClick={() => handleRemoveAdmin(admin.user_id, admin.email)}
                  title={
                    admins.length <= 1
                      ? "Impossible de révoquer le seul administrateur restant"
                      : "Révoquer l'accès administrateur"
                  }
                  className="grid size-9 place-items-center rounded-xl border border-line bg-white text-muted hover:border-danger-300 hover:bg-danger-50 hover:text-danger-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 cursor-pointer"
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Formulaire d'ajout (si moins de 2 admins) */}
      {!isMaxReached ? (
        <form onSubmit={handleAddAdmin} className="pt-3 border-t border-line space-y-3">
          <div>
            <label
              htmlFor="add-admin-email"
              className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
            >
              Ajouter le 2ème administrateur
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                id="add-admin-email"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="deuxieme.admin@example.com"
                className="h-11 flex-1 rounded-2xl border border-line bg-white px-3.5 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
              />
              <button
                type="submit"
                disabled={isAdding}
                className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50 transition-all shrink-0 cursor-pointer"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>Ajout…</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-3.5" />
                    <span>Accorder les droits</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-muted mt-1.5">
              L&apos;adresse doit correspondre à un compte déjà inscrit sur la plateforme.
            </p>
          </div>
        </form>
      ) : (
        <div className="pt-3 border-t border-line">
          <div className="flex items-center gap-2 rounded-2xl bg-sand/60 px-4 py-3 text-xs text-muted">
            <ShieldCheck className="size-4 text-brand-600 shrink-0" />
            <span>
              <strong>Quota maximal atteint :</strong> 2 administrateurs sont actuellement configurés. Pour en ajouter un nouveau, révoquez l&apos;un des accès existants ci-dessus.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
