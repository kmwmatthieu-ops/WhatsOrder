"use client";

import { useState } from "react";
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Hourglass,
  AlertCircle,
  FileText,
  Camera,
  Video,
  UserCheck,
  Sparkles,
} from "lucide-react";
import { submitCertificationRequest } from "./certification-actions";
import type { Shop, ShopCertification } from "@/types/database";

interface ShopCertificationCardProps {
  shop: Shop;
  isPremium: boolean;
  latestCertification: ShopCertification | null;
}

export function ShopCertificationCard({
  shop,
  isPremium,
  latestCertification,
}: ShopCertificationCardProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fichiers sélectionnés
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [identityFile, setIdentityFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!businessFile || !identityFile || !photoFile || !videoFile) {
      setError("Les 4 pièces justificatives sont strictement obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("business_doc", businessFile);
      formData.append("identity_doc", identityFile);
      formData.append("store_photo", photoFile);
      formData.append("store_video", videoFile);

      const res = await submitCertificationRequest(formData);
      if (res.ok) {
        setSuccess(res.message || "Dossier envoyé avec succès !");
      } else {
        setError(res.error || "Impossible d'envoyer votre dossier.");
      }
    } catch {
      setError("Une erreur inattendue est survenue lors de l'envoi.");
    } finally {
      setSubmitting(false);
    }
  }

  // 1. Boutique déjà officiellement certifiée
  if (shop.is_certified) {
    return (
      <div className="rounded-3xl border border-blue-200 bg-linear-to-br from-blue-50/80 to-purple-50/50 p-6 sm:p-7 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-xs">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-ink">Boutique Officiellement Certifiée</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-2xs">
                <CheckCircle2 className="size-3" />
                Vérifié
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Votre identité commerciale et votre boutique physique ont été vérifiées par l&apos;équipe.
            </p>
          </div>
        </div>
        <p className="text-xs text-blue-900 bg-white/80 p-3 rounded-2xl border border-blue-100 leading-relaxed">
          Le badge officiel de certification est actif. Il est affiché publiquement sur votre boutique et assure une mise en avant prioritaire de vos produits dans le catalogue <strong>Explorer</strong>.
        </p>
      </div>
    );
  }

  // 2. Dossier en cours d'examen (Pending)
  if (latestCertification?.status === "pending" || success) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 sm:p-7 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-amber-500 text-white shadow-xs">
            <Hourglass className="size-6 animate-pulse" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-ink">Dossier de Certification en Examen</h2>
              <span className="rounded-full bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-900">
                En attente
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Vos documents ont bien été transmis à notre équipe d&apos;administration.
            </p>
          </div>
        </div>
        <p className="text-xs text-amber-900 bg-white/80 p-3.5 rounded-2xl border border-amber-200/60 leading-relaxed">
          {success || "Nous procédons aux vérifications d'usage (documents commerciaux, identité, photo et vidéo du local). Vous recevrez la validation sous 24h à 48h."}
        </p>
      </div>
    );
  }

  // 3. Forfait non Premium : invitation
  if (!isPremium) {
    return (
      <div className="rounded-3xl border border-line bg-sand/30 p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="grid size-12 place-items-center rounded-2xl bg-sand text-muted">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-ink">Badge de Commerçant Certifié</h2>
                <span className="rounded-md bg-sand border border-line px-2 py-0.5 text-[10px] font-bold text-muted uppercase">
                  Option Premium
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Renforcez la confiance des acheteurs avec un badge vérifié officiel sur votre boutique et Explorer.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 4. Formulaire de soumission du dossier (Nouveau ou suite à rejet)
  return (
    <div className="rounded-3xl border border-line bg-white p-6 sm:p-7 shadow-xs space-y-6">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700">
          <Sparkles className="size-3.5" />
          <span>Privilège Formule Premium</span>
        </div>
        <h2 className="text-lg font-black text-ink mt-1">Demande de Certification Commerçant</h2>
        <p className="text-xs text-muted mt-0.5">
          Fournissez vos 4 pièces justificatives pour faire certifier votre boutique et obtenir le badge vérifié officiel.
        </p>
      </div>

      {latestCertification?.status === "rejected" && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-4 text-xs text-danger-800 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle className="size-4 shrink-0" />
            <span>Votre précédente demande n&apos;a pas pu être validée</span>
          </p>
          {latestCertification.admin_notes && (
            <p className="text-[11px] text-danger-700 pl-5">
              Motif de l&apos;équipe : {latestCertification.admin_notes}
            </p>
          )}
          <p className="text-[11px] text-danger-700 pl-5">
            Veuillez téléverser des documents plus nets ou complets ci-dessous.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3.5 text-xs text-danger-800 flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Document du commerce */}
        <div className="rounded-2xl border border-line p-3.5 space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <FileText className="size-4 text-brand-600" />
              <span>1. Document du commerce (PDF) *</span>
            </span>
            <span className="text-[10px] text-muted font-normal">Registre, patente, RCCM...</span>
          </label>
          <input
            type="file"
            required
            accept="application/pdf,image/*"
            onChange={(e) => setBusinessFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sand file:text-ink hover:file:bg-sand/70 cursor-pointer"
          />
          {businessFile && <p className="text-[11px] text-brand-700 font-medium">✓ {businessFile.name}</p>}
        </div>

        {/* 2. Pièce d'identité */}
        <div className="rounded-2xl border border-line p-3.5 space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <UserCheck className="size-4 text-brand-600" />
              <span>2. Pièce d&apos;identité du gérant *</span>
            </span>
            <span className="text-[10px] text-muted font-normal">CNI, Passeport, Permis (PDF/Image)</span>
          </label>
          <input
            type="file"
            required
            accept="application/pdf,image/*"
            onChange={(e) => setIdentityFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sand file:text-ink hover:file:bg-sand/70 cursor-pointer"
          />
          {identityFile && <p className="text-[11px] text-brand-700 font-medium">✓ {identityFile.name}</p>}
        </div>

        {/* 3. Photo du commerçant dans sa boutique */}
        <div className="rounded-2xl border border-line p-3.5 space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Camera className="size-4 text-brand-600" />
              <span>3. Photo de vous dans votre boutique (Image) *</span>
            </span>
            <span className="text-[10px] text-muted font-normal">PNG ou JPG</span>
          </label>
          <input
            type="file"
            required
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sand file:text-ink hover:file:bg-sand/70 cursor-pointer"
          />
          {photoFile && <p className="text-[11px] text-brand-700 font-medium">✓ {photoFile.name}</p>}
        </div>

        {/* 4. Vidéo dans la boutique */}
        <div className="rounded-2xl border border-line p-3.5 space-y-1.5">
          <label className="flex items-center justify-between text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Video className="size-4 text-brand-600" />
              <span>4. Courte vidéo de vous dans la boutique (Vidéo) *</span>
            </span>
            <span className="text-[10px] text-muted font-normal">MP4 ou WebM attestant du lieu</span>
          </label>
          <input
            type="file"
            required
            accept="video/mp4,video/webm,video/quicktime,video/*"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-sand file:text-ink hover:file:bg-sand/70 cursor-pointer"
          />
          {videoFile && <p className="text-[11px] text-brand-700 font-medium">✓ {videoFile.name}</p>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-700 disabled:opacity-50 transition-all"
        >
          <UploadCloud className="size-4" />
          <span>{submitting ? "Téléversement des fichiers en cours…" : "Soumettre mon dossier de certification"}</span>
        </button>
      </form>
    </div>
  );
}
