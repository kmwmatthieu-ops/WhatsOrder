"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Hourglass,
  FileText,
  UserCheck,
  Camera,
  Video,
  ExternalLink,
  Store,
} from "lucide-react";
import { reviewCertificationAction } from "./actions";
import { Button } from "@/components/ui/button";

export interface AdminCertificationRow {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_slug: string;
  owner_email: string;
  business_doc_url: string;
  identity_doc_url: string;
  store_photo_url: string;
  store_video_url: string;
  status: string;
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  is_certified: boolean;
}

interface AdminCertificationsTableProps {
  initialCertifications: AdminCertificationRow[];
}

export function AdminCertificationsTable({ initialCertifications }: AdminCertificationsTableProps) {
  const [certifications, setCertifications] = useState(initialCertifications);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const filtered = certifications.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  const pendingCount = certifications.filter((c) => c.status === "pending").length;

  function handleReview(certId: string, status: "approved" | "rejected") {
    let notes = "";
    if (status === "rejected") {
      const input = prompt("Motif du rejet (ex: document illisible, photo floue...) :");
      if (input === null) return;
      notes = input.trim();
    }

    setError(null);
    startTransition(async () => {
      const res = await reviewCertificationAction(certId, status, notes);
      if (!res.ok) {
        setError(res.error || "Erreur lors du traitement.");
      } else {
        setCertifications((prev) =>
          prev.map((c) =>
            c.id === certId
              ? {
                  ...c,
                  status,
                  admin_notes: notes || c.admin_notes,
                  reviewed_at: new Date().toISOString(),
                  is_certified: status === "approved",
                }
              : c
          )
        );
      }
    });
  }

  return (
    <div className="rounded-3xl border border-line bg-white p-5 sm:p-6 shadow-xs flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-2xl bg-purple-50 text-purple-700">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-ink">Dossiers de Certification Commerçant</h2>
              {pendingCount > 0 && (
                <span className="rounded-full bg-purple-600 px-2 py-0.5 text-[10px] font-black text-white">
                  {pendingCount} en attente
                </span>
              )}
            </div>
            <p className="text-xs text-muted">
              Examinez les pièces d&apos;identité, documents commerciaux, photos et vidéos pour octroyer le badge vérifié.
            </p>
          </div>
        </div>

        {/* Filtres par statut */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-sand/40 p-1 border border-line/60 text-xs">
          <button
            type="button"
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === "pending" ? "bg-white text-purple-800 shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            En attente ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter("approved")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === "approved" ? "bg-white text-ink shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            Certifiés
          </button>
          <button
            type="button"
            onClick={() => setFilter("rejected")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === "rejected" ? "bg-white text-ink shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            Rejetés
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filter === "all" ? "bg-white text-ink shadow-2xs" : "text-muted hover:text-ink"
            }`}
          >
            Tous ({certifications.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-danger-200 bg-danger-50 p-3 text-xs text-danger-800">
          {error}
        </div>
      )}

      {/* Liste des dossiers */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted">
          Aucun dossier de certification dans cette catégorie.
        </div>
      ) : (
        <div className="divide-y divide-line">
          {filtered.map((cert) => (
            <div key={cert.id} className="py-4.5 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${cert.shop_slug}`}
                      target="_blank"
                      className="font-black text-sm text-ink hover:text-brand-600 inline-flex items-center gap-1.5"
                    >
                      <Store className="size-4 text-brand-600" />
                      <span>{cert.shop_name}</span>
                      <ExternalLink className="size-3 text-muted" />
                    </Link>

                    {cert.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700">
                        <CheckCircle2 className="size-3" />
                        Certifié
                      </span>
                    ) : cert.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black uppercase text-amber-700">
                        <Hourglass className="size-3 animate-pulse" />
                        À examiner
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2 py-0.5 text-[10px] font-black uppercase text-danger-700">
                        <XCircle className="size-3" />
                        Rejeté
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Gérant : <strong>{cert.owner_email}</strong> • Soumis le{" "}
                    {new Date(cert.submitted_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                {/* Actions de validation */}
                {cert.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReview(cert.id, "approved")}
                      className="h-9 px-3.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                    >
                      <CheckCircle2 className="size-3.5" />
                      <span>Valider & Certifier</span>
                    </Button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleReview(cert.id, "rejected")}
                      className="h-9 px-3 rounded-xl border border-danger-200 text-danger-700 hover:bg-danger-50 text-xs font-bold transition-colors"
                    >
                      Rejeter
                    </button>
                  </div>
                )}
              </div>

              {/* Pièces justificatives fournies (4 documents) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {/* 1. Document du commerce */}
                <a
                  href={cert.business_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-sand/30 hover:bg-sand/70 text-xs text-ink transition-colors group"
                >
                  <FileText className="size-4 text-brand-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[11px]">1. Commerce</p>
                    <p className="text-[10px] text-muted truncate">Voir PDF / Doc</p>
                  </div>
                  <ExternalLink className="size-3 text-muted group-hover:text-ink shrink-0" />
                </a>

                {/* 2. Pièce d'identité */}
                <a
                  href={cert.identity_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-sand/30 hover:bg-sand/70 text-xs text-ink transition-colors group"
                >
                  <UserCheck className="size-4 text-brand-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[11px]">2. Identité</p>
                    <p className="text-[10px] text-muted truncate">Voir CNI / Passeport</p>
                  </div>
                  <ExternalLink className="size-3 text-muted group-hover:text-ink shrink-0" />
                </a>

                {/* 3. Photo dans la boutique */}
                <a
                  href={cert.store_photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-sand/30 hover:bg-sand/70 text-xs text-ink transition-colors group"
                >
                  <Camera className="size-4 text-brand-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[11px]">3. Photo boutique</p>
                    <p className="text-[10px] text-muted truncate">Ouvrir l&apos;image</p>
                  </div>
                  <ExternalLink className="size-3 text-muted group-hover:text-ink shrink-0" />
                </a>

                {/* 4. Vidéo dans la boutique */}
                <a
                  href={cert.store_video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-sand/30 hover:bg-sand/70 text-xs text-ink transition-colors group"
                >
                  <Video className="size-4 text-brand-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate text-[11px]">4. Vidéo du local</p>
                    <p className="text-[10px] text-muted truncate">Lire la vidéo</p>
                  </div>
                  <ExternalLink className="size-3 text-muted group-hover:text-ink shrink-0" />
                </a>
              </div>

              {cert.admin_notes && (
                <p className="text-[11px] text-muted italic bg-sand/20 p-2 rounded-xl">
                  Note admin : {cert.admin_notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
