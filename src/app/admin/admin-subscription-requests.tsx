"use client";

import { useState } from "react";
import { Check, X, Hourglass, Smartphone, AlertCircle } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { approveSubscriptionRequest, rejectSubscriptionRequest } from "./actions";

export type AdminRequestRow = {
  id: string;
  shop_id: string;
  shop_name: string;
  requested_plan_id: string;
  duration_months: number;
  amount_due: number;
  payment_method: string;
  sender_phone: string;
  transaction_reference: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export function AdminSubscriptionRequests({ requests }: { requests: AdminRequestRow[] }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const pendingRequests = requests.filter((r) => r.status === "pending");

  async function handleApprove(id: string) {
    if (!confirm("Confirmer la réception des fonds et activer l'abonnement ?")) return;
    setProcessingId(id);
    setFeedback(null);
    const res = await approveSubscriptionRequest(id);
    if (res.ok) {
      setFeedback({ tone: "success", text: "Abonnement validé et activé avec succès !" });
    } else {
      setFeedback({ tone: "error", text: res.error || "Erreur de validation." });
    }
    setProcessingId(null);
  }

  async function handleReject(id: string) {
    const reason = prompt("Motif du rejet (ex: Paiement non reçu, numéro invalide) :", "Paiement non reçu");
    if (!reason) return;
    setProcessingId(id);
    setFeedback(null);
    const res = await rejectSubscriptionRequest(id, reason);
    if (res.ok) {
      setFeedback({ tone: "success", text: "Demande rejetée." });
    } else {
      setFeedback({ tone: "error", text: res.error || "Erreur." });
    }
    setProcessingId(null);
  }

  if (pendingRequests.length === 0) {
    return (
      <div className="rounded-3xl border border-line bg-white p-6 text-center text-xs text-muted shadow-xs">
        <Hourglass className="size-6 mx-auto mb-2 text-muted/50" />
        Aucune demande de paiement Mobile Money en attente de validation.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-line bg-white shadow-xs overflow-hidden">
      <div className="p-5 border-b border-line flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Demandes de paiement Mobile Money en attente</h2>
          <p className="text-xs text-muted mt-0.5">
            Vérifiez vos comptes (Wave, Orange, MTN, Moov) avant de valider.
          </p>
        </div>
        <span className="rounded-full bg-blue-100 text-blue-800 font-black text-xs px-2.5 py-0.5">
          {pendingRequests.length} en attente
        </span>
      </div>

      {feedback && (
        <div
          className={`p-3 text-xs font-semibold ${
            feedback.tone === "success" ? "bg-success-50 text-success-800" : "bg-danger-50 text-danger-800"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-sand/40 border-b border-line font-bold text-muted uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3.5 pl-5">Boutique</th>
              <th className="p-3.5">Plan & Durée</th>
              <th className="p-3.5">Montant dû</th>
              <th className="p-3.5">Paiement Mobile Money</th>
              <th className="p-3.5">Réf. SMS</th>
              <th className="p-3.5">Date</th>
              <th className="p-3.5 pr-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {pendingRequests.map((req) => (
              <tr key={req.id} className="hover:bg-sand/20 transition-colors">
                <td className="p-3.5 pl-5 font-bold text-ink whitespace-nowrap">
                  {req.shop_name}
                </td>
                <td className="p-3.5 whitespace-nowrap">
                  <span className="rounded-md bg-brand-50 text-brand-700 font-bold px-1.5 py-0.5 uppercase text-[10px]">
                    {req.requested_plan_id}
                  </span>{" "}
                  <span className="text-muted">({req.duration_months} mois)</span>
                </td>
                <td className="p-3.5 font-black text-ink whitespace-nowrap">
                  {formatFCFA(req.amount_due)}
                </td>
                <td className="p-3.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="size-3.5 text-brand-600" />
                    <span className="font-semibold text-ink uppercase">{req.payment_method}</span>
                    <span className="text-muted">({req.sender_phone})</span>
                  </div>
                </td>
                <td className="p-3.5 text-muted font-mono text-[11px] whitespace-nowrap">
                  {req.transaction_reference || "—"}
                </td>
                <td className="p-3.5 text-muted whitespace-nowrap">
                  {new Date(req.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleApprove(req.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-success-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-success-700 disabled:opacity-50 transition-colors"
                      title="Valider le paiement et activer l'abonnement"
                    >
                      <Check className="size-3.5" />
                      <span>Valider</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === req.id}
                      onClick={() => handleReject(req.id)}
                      className="inline-flex items-center gap-1 rounded-xl border border-danger-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-danger-700 hover:bg-danger-50 disabled:opacity-50 transition-colors"
                      title="Rejeter la demande"
                    >
                      <X className="size-3.5" />
                      <span>Rejeter</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
