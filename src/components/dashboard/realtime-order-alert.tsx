"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, ArrowRight, Volume2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { playOrderChime, triggerHapticFeedback, updateAppBadge, clearAppBadge } from "@/lib/sound";
import { formatFCFA } from "@/lib/format";

export function RealtimeOrderAlert({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [newOrder, setNewOrder] = useState<{ id: string; code?: string; total?: number } | null>(null);
  const unreadCountRef = useRef(0);

  useEffect(() => {
    const supabase = createClient();

    // Demander la permission de notification au navigateur si elle n'a pas encore été sollicitée
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    const channel = supabase
      .channel(`shop-orders-${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const order = payload.new as { id: string; public_code?: string; total?: number };
          setNewOrder({ id: order.id, code: order.public_code, total: order.total });

          // 1. Sonnerie distinctive de caisse / carillon
          playOrderChime();

          // 2. Vibration haptique sur téléphone
          triggerHapticFeedback();

          // 3. Badge rouge sur l'icône de l'application PWA (comme sur WhatsApp)
          unreadCountRef.current += 1;
          updateAppBadge(unreadCountRef.current);

          // 4. Notification système native sur l'appareil (mobile & PC)
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              const formattedTotal = order.total ? ` • ${formatFCFA(order.total)}` : "";
              new Notification("Nouvelle commande reçue ! 🔔", {
                body: `Commande #${order.public_code || ""}${formattedTotal} enregistrée dans votre boutique.`,
                icon: "/icon-192.png",
                badge: "/icon-192.png",
              });
            } catch {}
          }

          // 5. Actualiser la vue en arrière-plan
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, router]);

  function handleDismiss() {
    setNewOrder(null);
    unreadCountRef.current = 0;
    clearAppBadge();
  }

  if (!newOrder) return null;

  return (
    <div
      role="status"
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center gap-3 rounded-3xl border-2 border-brand-500 bg-white p-4 text-ink shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-600 text-white shadow-md">
        <Bell className="size-5 animate-bounce" aria-hidden />
        {/* Petit badge rouge pulsant façon WhatsApp */}
        <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-danger-600 text-[9px] font-black text-white ring-2 ring-white">
          1
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-black text-ink">Nouvelle commande !</p>
          <Volume2 className="size-3 text-brand-600" aria-label="Alerte sonore activée" />
        </div>
        <p className="text-xs text-brand-700 truncate font-bold mt-0.5">
          {newOrder.code ? `Code #${newOrder.code}` : "Nouvelle commande client"}
          {typeof newOrder.total === "number" && ` • ${formatFCFA(newOrder.total)}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/tableau-de-bord/commandes/${newOrder.id}`}
          onClick={handleDismiss}
          className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-700 active:scale-95 transition-all cursor-pointer"
        >
          <span>Voir</span>
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1.5 text-muted hover:text-ink rounded-lg transition-colors cursor-pointer"
          aria-label="Fermer l'alerte"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
