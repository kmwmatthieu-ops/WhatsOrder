"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Clock, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { verifySaspayReturnSession } from "../saspay-actions";

interface ReturnClientViewProps {
  sessionId: string;
}

export function ReturnClientView({ sessionId }: ReturnClientViewProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN">("UNKNOWN");
  const [message, setMessage] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  async function checkStatus(isRefresh = false) {
    if (!sessionId) {
      setLoading(false);
      setStatus("FAILED");
      setMessage("Aucun identifiant de session de paiement fourni.");
      return;
    }

    if (isRefresh) setRefreshing(true);

    try {
      const res = await verifySaspayReturnSession(sessionId);
      setStatus(res.status);
      setMessage(res.message || "");
    } catch {
      setStatus("PENDING");
      setMessage("Vérification en cours auprès de votre opérateur.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    checkStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-white p-8 text-center shadow-xs max-w-md w-full">
        <div className="size-10 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <div className="space-y-1">
          <p className="text-base font-bold text-ink">Vérification de votre paiement…</p>
          <p className="text-xs text-muted">Nous confirmons la transaction auprès de SasPay.</p>
        </div>
      </div>
    );
  }

  if (status === "SUCCESS") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-xs max-w-md w-full">
        <div className="grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-10" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-black text-ink">Paiement confirmé !</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            {message || "Votre abonnement a été activé avec succès. Vous profitez dès maintenant de tous vos avantages."}
          </p>
        </div>
        <div className="w-full pt-2">
          <Link href="/tableau-de-bord/abonnement" className="w-full">
            <Button block variant="primary">
              <span>Voir mon abonnement</span>
              <ArrowRight className="size-4 ml-1.5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-xs max-w-md w-full">
        <div className="grid size-16 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          <Clock className="size-10" aria-hidden />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-black text-ink">Paiement en cours de validation</h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Votre paiement Mobile Money est en cours de traitement par l&apos;opérateur. L&apos;activation se fait généralement en 1 à 2 minutes.
          </p>
        </div>
        <div className="w-full space-y-2 pt-2">
          <Button
            block
            variant="secondary"
            onClick={() => checkStatus(true)}
            loading={refreshing}
          >
            <RefreshCw className={`size-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
            <span>Actualiser le statut</span>
          </Button>
          <Link href="/tableau-de-bord/abonnement" className="block w-full">
            <Button block variant="ghost">
              <span>Retourner à mon tableau de bord</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border border-line bg-white p-6 sm:p-8 text-center shadow-xs max-w-md w-full">
      <div className="grid size-16 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <AlertCircle className="size-10" aria-hidden />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-black text-ink">Paiement non complété</h1>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          {message || "La transaction a été annulée ou n'a pas pu aboutir. Aucun montant n'a été débité."}
        </p>
      </div>
      <div className="w-full pt-2">
        <Link href="/tableau-de-bord/abonnement" className="w-full">
          <Button block variant="primary">
            <span>Réessayer le paiement</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
