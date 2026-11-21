"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Shield, Lock, Mail, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { loginAdmin, type AdminLoginState } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState<AdminLoginState, FormData>(
    loginAdmin,
    {}
  );

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-cream text-ink">
      {/* En-tête minimaliste */}
      <header className="border-b border-line bg-white px-4 py-4 sticky top-0 z-20">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="rounded-lg bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Admin
            </span>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            <span>Site public</span>
          </Link>
        </div>
      </header>

      {/* Formulaire de connexion */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-sm">
          {/* Icône & Titres */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 mb-3 shadow-2xs">
              <Shield className="size-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-ink">Portail Administrateur</h1>
            <p className="text-xs text-muted mt-1 max-w-xs">
              Espace sécurisé réservé aux administrateurs de la plateforme Bon Waz à Dealer.
            </p>
          </div>

          {/* Bannière d'erreur */}
          {state?.error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl border border-danger-200 bg-danger-50 p-4 text-xs font-bold text-danger-800"
            >
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Adresse Email Admin
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none"
                  aria-hidden
                />
                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@bonwazadealer.com"
                  className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 transition-all"
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none"
                  aria-hidden
                />
                <input
                  id="admin-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-11 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink focus:outline-none"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Bouton de validation */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={pending}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-black px-4 text-sm font-bold text-white shadow-sm hover:bg-neutral-800 active:scale-98 disabled:opacity-50 transition-all cursor-pointer"
              >
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Vérification des accès…</span>
                  </>
                ) : (
                  <>
                    <Shield className="size-4" />
                    <span>Accéder à l&apos;administration</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Rappel sécurité */}
          <div className="mt-6 pt-5 border-t border-line text-center">
            <p className="text-[11px] text-muted">
              Toutes les connexions administratives sont chiffrées et consignées dans les registres de sécurité.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
