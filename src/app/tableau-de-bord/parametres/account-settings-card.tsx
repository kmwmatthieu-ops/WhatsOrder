"use client";

import { useState, useActionState } from "react";
import { KeyRound, Mail, AlertTriangle, Trash2, X, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { updateAccountPassword, updateAccountEmail, deleteMyAccount } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { Input } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

interface AccountSettingsCardProps {
  currentEmail: string;
}

export function AccountSettingsCard({ currentEmail }: AccountSettingsCardProps) {
  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Password state
  const [pwdState, pwdAction, pwdPending] = useActionState(updateAccountPassword, initialActionState);

  // Email state
  const [emailState, emailAction, emailPending] = useActionState(updateAccountEmail, initialActionState);

  // Delete state
  const [delState, delAction, delPending] = useActionState(deleteMyAccount, initialActionState);

  if (delState.message === "REDIRECT_LOGIN") {
    window.location.replace("/connexion");
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 sm:p-7 shadow-xs space-y-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-base font-bold text-ink">Mon Compte & Sécurité</h2>
          <p className="text-xs text-muted">Gérez vos identifiants de connexion et la sécurité de votre compte.</p>
        </div>
      </div>

      <div className="divide-y divide-line/60 rounded-2xl border border-line bg-sand/20">
        {/* Ligne E-mail */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
          <div className="flex items-center gap-3">
            <Mail className="size-4 text-muted shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">Adresse e-mail</p>
              <p className="text-xs text-muted font-mono">{currentEmail}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowEmailModal(true)}
          >
            <span>Modifier l&apos;e-mail</span>
          </Button>
        </div>

        {/* Ligne Mot de passe */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
          <div className="flex items-center gap-3">
            <KeyRound className="size-4 text-muted shrink-0" />
            <div>
              <p className="text-xs font-bold text-ink">Mot de passe</p>
              <p className="text-xs text-muted">••••••••••••</p>
            </div>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            <span>Modifier le mot de passe</span>
          </Button>
        </div>
      </div>

      {/* Zone Danger : Suppression de compte */}
      <div className="rounded-2xl border border-danger-200 bg-danger-50/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-danger-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-danger-800">Zone dangereuse : Supprimer mon compte</p>
            <p className="text-[11px] text-muted leading-relaxed">
              Supprime définitivement votre compte, votre boutique, vos produits et toutes vos commandes associées.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => setShowDeleteModal(true)}
          className="shrink-0"
        >
          <Trash2 className="size-3.5 mr-1" />
          <span>Supprimer mon compte</span>
        </Button>
      </div>

      {/* MODAL MODIFICATION MOT DE PASSE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-base font-bold text-ink">Modifier mon mot de passe</h3>
            
            {pwdState.ok && <Alert tone="success">{pwdState.message}</Alert>}
            {pwdState.error && <Alert tone="error">{pwdState.error}</Alert>}

            <form action={pwdAction} className="space-y-3">
              <PasswordInput
                label="Mot de passe actuel"
                name="current_password"
                required
                autoComplete="current-password"
              />
              <PasswordInput
                label="Nouveau mot de passe"
                name="new_password"
                required
                minLength={8}
                hint="Au moins 8 caractères."
                autoComplete="new-password"
              />
              <PasswordInput
                label="Confirmer le nouveau mot de passe"
                name="confirm_password"
                required
                autoComplete="new-password"
              />
              <div className="pt-2 flex gap-2">
                <Button type="submit" block variant="primary" loading={pwdPending}>
                  <span>Enregistrer le mot de passe</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MODIFICATION E-MAIL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowEmailModal(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-base font-bold text-ink">Modifier mon adresse e-mail</h3>
            
            {emailState.ok && <Alert tone="success">{emailState.message}</Alert>}
            {emailState.error && <Alert tone="error">{emailState.error}</Alert>}

            <form action={emailAction} className="space-y-3">
              <Input
                label="Nouvelle adresse e-mail"
                name="new_email"
                type="email"
                required
                defaultValue={currentEmail}
              />
              <p className="text-[11px] text-muted">
                Un e-mail contenant un lien de confirmation sera envoyé à cette nouvelle adresse.
              </p>
              <div className="pt-2">
                <Button type="submit" block variant="primary" loading={emailPending}>
                  <span>Envoyer la confirmation</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUPPRESSION DÉFINITIVE DE COMPTE */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <button
              type="button"
              onClick={() => setShowDeleteModal(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand"
            >
              <X className="size-4" />
            </button>

            <div className="grid size-12 place-items-center rounded-2xl bg-danger-50 text-danger-600">
              <Trash2 className="size-6" />
            </div>

            <div>
              <h3 className="text-lg font-black text-ink">Supprimer mon compte définitivement</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Cette action est <strong>irréversible</strong>. Votre compte, votre boutique en ligne, vos produits, variantes et toutes vos commandes seront définitivement effacés de nos serveurs.
              </p>
            </div>

            {delState.error && <Alert tone="error">{delState.error}</Alert>}

            <form action={delAction} className="space-y-3 pt-1">
              <PasswordInput
                label="Confirmez avec votre mot de passe"
                name="password"
                required
                placeholder="Votre mot de passe"
              />
              <Button type="submit" block variant="danger" loading={delPending}>
                <span>Supprimer définitivement tout mon compte</span>
              </Button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
