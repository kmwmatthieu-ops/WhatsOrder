"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, ShoppingBag, ArrowRight } from "lucide-react";
import { SignUpForm } from "./sign-up-form";
import { ClientSignUpForm } from "@/app/compte/inscription/client-signup-form";
import { SupabaseNotice } from "@/components/ui/supabase-notice";

export function InscriptionView({
  initialType = "merchant",
}: {
  initialType?: "merchant" | "client";
}) {
  const [accountType, setAccountType] = useState<"merchant" | "client">(initialType);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête avec titre dynamique */}
      <div>
        <h1 className="text-2xl font-black text-ink">
          {accountType === "merchant" ? "Créez votre boutique en ligne" : "Créez votre compte client"}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          {accountType === "merchant"
            ? "Gratuit, en 2 minutes, pour vendre vos produits sur WhatsApp."
            : "Suivez vos boutiques favorites et profitez d'un fil Explorer sur-mesure."}
        </p>
      </div>

      {/* Sélecteur de type de compte : Commerçant / Client */}
      <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-sand border border-line">
        <button
          type="button"
          onClick={() => setAccountType("merchant")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            accountType === "merchant"
              ? "bg-white text-ink shadow-xs border border-line/60"
              : "text-muted hover:text-ink"
          }`}
        >
          <Store className={`size-4 ${accountType === "merchant" ? "text-brand-600" : "text-muted"}`} />
          <span>Commerçant</span>
        </button>

        <button
          type="button"
          onClick={() => setAccountType("client")}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            accountType === "client"
              ? "bg-white text-ink shadow-xs border border-line/60"
              : "text-muted hover:text-ink"
          }`}
        >
          <ShoppingBag className={`size-4 ${accountType === "client" ? "text-brand-600" : "text-muted"}`} />
          <span>Client</span>
        </button>
      </div>

      <SupabaseNotice />

      {/* Formulaire sélectionné */}
      {accountType === "merchant" ? (
        <SignUpForm />
      ) : (
        <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-xs">
          <ClientSignUpForm />
        </div>
      )}

      {/* Note d'interopérabilité (Règle : l'utilisateur pourra toujours basculer ou créer une boutique plus tard) */}
      <div className="rounded-2xl border border-line bg-sand/40 p-4 text-xs text-muted leading-relaxed">
        <p className="font-bold text-ink mb-1">
          💡 Un compte unique pour tout faire
        </p>
        <p>
          Que vous choisissiez <strong>Commerçant</strong> ou <strong>Client</strong> aujourd&apos;hui, vous pourrez toujours basculer entre votre profil client et la création d&apos;une boutique en ligne à tout moment depuis votre menu.
        </p>
      </div>

      {/* Lien vers connexion */}
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link
          href="/connexion"
          prefetch={false}
          className="font-bold text-brand-700 underline-offset-4 hover:underline"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}
