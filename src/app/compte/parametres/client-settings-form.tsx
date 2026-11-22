"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Trash2, RotateCcw, AlertTriangle, CheckCircle2, LogOut } from "lucide-react";
import {
  updateClientProfile,
  clearClientActivity,
  togglePersonalizationConsentAction,
  deleteClientAccount,
  clientSignOut,
  type ClientActionState,
} from "../actions";
import { updateAccountPassword } from "@/app/tableau-de-bord/parametres/actions";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import type { CustomerProfile } from "@/types/database";

interface ClientSettingsFormProps {
  email: string;
  profile: (CustomerProfile & { residence_area?: string | null }) | null;
  activityCount?: number;
}

export function ClientSettingsForm({ email, profile, activityCount = 0 }: ClientSettingsFormProps) {
  const router = useRouter();

  // Profil
  const [profileState, profileAction, profilePending] = useActionState<ClientActionState, FormData>(
    updateClientProfile,
    {}
  );
  const [personalization, setPersonalization] = useState(
    profile?.personalization_enabled ?? true
  );
  const [eventsCount, setEventsCount] = useState(activityCount);

  // État d'affichage du profil personnel : se masque dès que les informations sont enregistrées
  const isInitialCompleted = Boolean(
    profile?.full_name &&
    profile.full_name !== "Client" &&
    (profile?.phone || (profile as { residence_area?: string | null })?.residence_area)
  );
  const [isEditing, setIsEditing] = useState(!isInitialCompleted);
  const isCompleted = isInitialCompleted || Boolean(profileState.ok);

  // Historique
  const [clearState, setClearState] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);

  // Mot de passe
  const [pwdState, pwdAction, pwdPending] = useActionState(updateAccountPassword, {});

  // Suppression
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteState, deleteAction, deletePending] = useActionState<ClientActionState, FormData>(
    deleteClientAccount,
    {}
  );

  async function handleClearHistory() {
    setIsClearing(true);
    const res = await clearClientActivity();
    setIsClearing(false);
    if (res.ok) {
      setClearState(res.message || "Historique d'activité effacé avec succès.");
      setEventsCount(0);
    }
  }

  if (deleteState.ok && deleteState.message === "REDIRECT_HOME") {
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Informations Personnelles (Masqué une fois enregistré) */}
      {isCompleted && !isEditing ? (
        <section className="rounded-3xl border border-line bg-white p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700 shrink-0">
              <CheckCircle2 className="size-5 text-brand-600" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm font-bold text-ink">Profil personnel enregistré</p>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700">
                  Enregistré
                </span>
              </div>
              <p className="text-[11px] text-muted truncate mt-0.5">
                {profile?.full_name || "Client"}
                {profile?.phone ? ` • ${profile.phone}` : ""}
                {(profile as { residence_area?: string | null })?.residence_area
                  ? ` • ${(profile as { residence_area?: string | null }).residence_area}`
                  : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center justify-center rounded-xl border border-line bg-sand/60 px-3.5 py-1.5 text-xs font-semibold text-ink hover:bg-sand transition-colors shrink-0 cursor-pointer self-end sm:self-auto"
          >
            Modifier
          </button>
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-700">
                <User className="size-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-ink">Profil personnel</h2>
                <p className="text-xs text-muted">Vos coordonnées visibles lors de vos commandes.</p>
              </div>
            </div>
            {isCompleted && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="text-xs font-semibold text-muted hover:text-ink cursor-pointer"
              >
                Fermer
              </button>
            )}
          </div>

          <form action={profileAction} className="flex flex-col gap-4 mt-2">
            {profileState.error && (
              <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                {profileState.error}
              </div>
            )}
            {profileState.ok && (
              <div className="rounded-2xl border border-success-200 bg-success-50 p-3 text-xs text-success-800 flex items-center gap-2">
                <CheckCircle2 className="size-4 shrink-0 text-success-600" />
                <span>{profileState.message}</span>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">Adresse e-mail</label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full h-11 rounded-2xl border border-line bg-sand/50 px-3.5 text-xs text-muted cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">Nom complet *</label>
              <input
                type="text"
                name="fullName"
                required
                placeholder="Ex. Christian Mba"
                defaultValue={profile?.full_name ?? ""}
                className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink">Numéro de téléphone</label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="Ex. +241 07 00 00 00"
                  defaultValue={profile?.phone ?? ""}
                  className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-ink">Zone de résidence</label>
                <input
                  type="text"
                  name="residenceArea"
                  placeholder="Ex. Akanda, Libreville / Port-Gentil"
                  defaultValue={(profile as { residence_area?: string | null })?.residence_area ?? ""}
                  className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <Toggle
                name="personalizationEnabled"
                label="Personnalisation du fil Explorer"
                description="Adapter les suggestions de produits à vos visites et centres d'intérêt."
                checked={personalization}
                onChange={setPersonalization}
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              {isCompleted && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-9 rounded-2xl border border-line bg-white px-3.5 text-xs font-semibold text-muted hover:text-ink hover:bg-sand"
                >
                  Annuler
                </button>
              )}
              <Button type="submit" size="sm" loading={profilePending}>
                Enregistrer mon profil
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* 2. Vie privée & Historique d'activité (Phase V3-D) */}
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div>
          <h2 className="text-base font-bold text-ink">Vie privée & Personnalisation</h2>
          <p className="text-xs text-muted mt-0.5 leading-relaxed">
            Vos données de navigation (vues, clics, recherches) servent exclusivement à vous proposer des recommandations sur-mesure dans l&apos;onglet <strong>Pour vous</strong> d&apos;Explorer. Les commerçants n&apos;ont aucun accès à votre activité nominative.
          </p>
        </div>

        {clearState && (
          <div className="rounded-2xl border border-success-200 bg-success-50 p-3 text-xs text-success-800 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-success-600" />
            <span>{clearState}</span>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-sand/20 p-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-ink">Recommandations personnalisées</p>
            <p className="text-[11px] text-muted">
              {personalization
                ? "Activé : votre fil « Pour vous » s'adapte à vos goûts."
                : "Désactivé : aucune donnée d'activité n'est enregistrée."}
            </p>
          </div>
          <Toggle
            label="Recommandations personnalisées"
            hideLabel
            name="personalizationToggle"
            checked={personalization}
            onChange={async (val) => {
              setPersonalization(val);
              await togglePersonalizationConsentAction(val);
              if (!val) {
                setEventsCount(0);
                setClearState("Personnalisation désactivée et historique d'activité effacé.");
              }
            }}
          />
        </div>

        <div className="flex items-center justify-between py-2 border-y border-line text-xs">
          <span className="text-muted">Interactions enregistrées (vues, clics)</span>
          <span className="font-bold text-ink">
            {eventsCount > 0 ? `${eventsCount} interaction${eventsCount > 1 ? "s" : ""}` : "Aucune interaction"}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <span className="text-xs text-muted">Effacer définitivement l&apos;historique</span>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleClearHistory}
            loading={isClearing}
            disabled={eventsCount === 0}
          >
            <RotateCcw className="size-3.5 mr-1.5" />
            <span>Effacer mon historique</span>
          </Button>
        </div>
      </section>

      {/* 3. Sécurité (Mot de passe) */}
      <section className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-sand text-ink">
            <Lock className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink">Sécurité du mot de passe</h2>
            <p className="text-xs text-muted">Mettez à jour le mot de passe de votre compte.</p>
          </div>
        </div>

        <form action={pwdAction} className="flex flex-col gap-3.5 mt-2">
          {pwdState.error && (
            <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
              {pwdState.error}
            </div>
          )}
          {pwdState.ok && (
            <div className="rounded-2xl border border-success-200 bg-success-50 p-3 text-xs text-success-800 flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0 text-success-600" />
              <span>{pwdState.message}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">Nouveau mot de passe</label>
              <input
                type="password"
                name="newPassword"
                required
                minLength={8}
                placeholder="8 caractères min."
                className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-ink">Confirmer le mot de passe</label>
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={8}
                placeholder="Répétez le mot de passe"
                className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" size="sm" loading={pwdPending}>
              Changer mon mot de passe
            </Button>
          </div>
        </form>
      </section>

      {/* 4. Zone Dangereuse : Supprimer mon compte client */}
      <section className="rounded-3xl border border-danger-200 bg-danger-50/40 p-5 sm:p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-danger-100 text-danger-700">
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-danger-900">Zone dangereuse : Supprimer mon compte</h2>
            <p className="text-xs text-danger-800/80">
              Supprime définitivement votre profil, votre historique et vos accès. Cette action est irréversible.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-danger-200/60">
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-danger-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-danger-700 transition-colors shadow-xs"
          >
            <Trash2 className="size-4" />
            <span>Supprimer mon compte client</span>
          </button>
        </div>
      </section>

      {/* 5. Déconnexion */}
      <div className="flex justify-center pt-2">
        <form action={clientSignOut}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-xs font-bold text-muted hover:text-danger-600 transition-colors p-2"
          >
            <LogOut className="size-4" />
            <span>Se déconnecter de mon compte client</span>
          </button>
        </form>
      </div>

      {/* Modal confirmation suppression */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-2xl bg-danger-100 text-danger-700">
                <AlertTriangle className="size-5" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-ink">Confirmer la suppression</h3>
                <p className="text-xs text-muted">Cette action est immédiate et irréversible.</p>
              </div>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Pour des raisons de sécurité, veuillez confirmer votre mot de passe pour effacer l&apos;ensemble de vos données.
            </p>

            <form action={deleteAction} className="flex flex-col gap-3">
              {deleteState.error && (
                <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-700">
                  {deleteState.error}
                </div>
              )}

              <input
                type="password"
                name="password"
                required
                placeholder="Votre mot de passe actuel"
                className="w-full h-11 rounded-2xl border border-line bg-white px-3.5 text-xs text-ink focus:border-brand-600 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  disabled={deletePending}
                  className="h-10 rounded-2xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-sand"
                >
                  Annuler
                </button>
                <Button type="submit" variant="danger" size="sm" loading={deletePending}>
                  Confirmer la suppression
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
