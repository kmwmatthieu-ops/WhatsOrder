"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Truck,
  PackageCheck,
  XCircle,
  Check,
} from "lucide-react";
import { updateOrderStatus } from "@/app/tableau-de-bord/commandes/actions";
import { Spinner } from "@/components/ui/spinner";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

type SimpleAction = {
  value: "confirmed" | "delivering" | "delivered" | "cancelled";
  label: string;
  sublabel: string;
  icon: typeof CheckCircle2;
  activeClass: string;
  waTemplate: (customerName: string, publicCode: string, shopName: string) => string;
};

const SIMPLE_STATUS_ACTIONS: SimpleAction[] = [
  {
    value: "confirmed",
    label: "Confirmée",
    sublabel: "Validée & payée",
    icon: CheckCircle2,
    activeClass: "border-brand-600 bg-brand-50 text-brand-800 ring-2 ring-brand-100",
    waTemplate: (name, code, shop) =>
      `Bonjour ${name}, votre commande *${code}* chez *${shop}* est bien *confirmée* ✅. Merci pour votre confiance !`,
  },
  {
    value: "delivering",
    label: "En livraison",
    sublabel: "En route / Prête",
    icon: Truck,
    activeClass: "border-indigo-600 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-100",
    waTemplate: (name, code, shop) =>
      `Bonjour ${name}, bonne nouvelle : votre commande *${code}* chez *${shop}* est *en cours de livraison* 🚚 !`,
  },
  {
    value: "delivered",
    label: "Livrée",
    sublabel: "Terminée & remise",
    icon: PackageCheck,
    activeClass: "border-success-600 bg-success-50 text-success-800 ring-2 ring-success-100",
    waTemplate: (name, code, shop) =>
      `Bonjour ${name}, votre commande *${code}* chez *${shop}* a été marquée comme *livrée* 🎉. À très bientôt !`,
  },
  {
    value: "cancelled",
    label: "Annulée",
    sublabel: "Commande annulée",
    icon: XCircle,
    activeClass: "border-danger-600 bg-danger-50 text-danger-700 ring-2 ring-danger-100",
    waTemplate: (name, code, shop) =>
      `Bonjour ${name}, votre commande *${code}* chez *${shop}* a été *annulée*. N'hésitez pas à nous écrire si besoin.`,
  },
];

function normalizeToSimple(status: string): string {
  if (status === "preparing") return "confirmed";
  if (status === "ready") return "delivering";
  return status;
}

export function OrderStatusSelect({
  orderId,
  currentStatus,
  publicCode,
  shopName,
  customerName,
  customerPhone,
}: {
  orderId: string;
  currentStatus: string;
  publicCode?: string;
  shopName?: string;
  customerName?: string;
  customerPhone?: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(() => normalizeToSimple(currentStatus));
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setStatus(normalizeToSimple(currentStatus));
  }, [currentStatus]);

  function handleSelect(newStatus: string) {
    if (newStatus === status || isPending) return;
    setError("");
    setSuccess(false);

    startTransition(async () => {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.error) {
        setError(res.error);
      } else {
        setStatus(newStatus);
        setSuccess(true);
        router.refresh();
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  }

  const activeAction = SIMPLE_STATUS_ACTIONS.find((a) => a.value === status);
  const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, "") : "";
  const waNotifyUrl =
    cleanPhone && activeAction && publicCode && shopName
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
          activeAction.waTemplate(customerName || "Client", publicCode, shopName)
        )}`
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
            Action rapide sur la commande
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            Touchez une étape pour mettre à jour votre suivi en 1 clic.
          </p>
        </div>
        {isPending && <Spinner className="size-4 text-brand-600 shrink-0" />}
        {success && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2.5 py-0.5 text-[11px] font-bold text-success-700">
            <Check className="size-3.5" /> Enregistré
          </span>
        )}
      </div>

      {/* Grille 2x2 de boutons directs en 1 clic */}
      <div className="grid grid-cols-2 gap-2">
        {SIMPLE_STATUS_ACTIONS.map((item) => {
          const Icon = item.icon;
          const isSelected = status === item.value;
          return (
            <button
              key={item.value}
              type="button"
              disabled={isPending}
              onClick={() => handleSelect(item.value)}
              className={`flex items-center gap-2.5 rounded-2xl border p-3 text-left transition-all cursor-pointer disabled:opacity-60 ${
                isSelected
                  ? item.activeClass
                  : "border-line bg-white text-ink hover:bg-sand/50"
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${
                  isSelected
                    ? "text-current"
                    : item.value === "cancelled"
                      ? "text-danger-600"
                      : "text-brand-600"
                }`}
              />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-extrabold leading-tight truncate">
                  {item.label}
                </p>
                <p className="text-[10px] opacity-75 truncate mt-0.5">
                  {item.sublabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bouton WhatsApp avec l'icône officielle */}
      {waNotifyUrl && activeAction && (
        <a
          href={waNotifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex items-center justify-center gap-2 rounded-2xl border border-[#25D366]/40 bg-[#25D366]/10 px-3.5 py-2.5 text-xs font-bold text-[#128C7E] hover:bg-[#25D366]/20 transition-colors"
        >
          <WhatsAppIcon className="size-4 text-[#25D366]" />
          <span className="truncate">
            Prévenir le client sur WhatsApp : &laquo;&nbsp;{activeAction.label}&nbsp;&raquo;
          </span>
        </a>
      )}

      {error && <p className="text-xs text-danger-600">{error}</p>}
    </div>
  );
}
