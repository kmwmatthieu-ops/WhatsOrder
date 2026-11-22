"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, ArrowRight, Volume2 } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  playOrderChime,
  triggerHapticFeedback,
  updateAppBadge,
  clearAppBadge,
  sendSystemNotification,
} from "@/lib/sound";
import { formatFCFA } from "@/lib/format";

export function RealtimeOrderAlert({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [newOrder, setNewOrder] = useState<{ id: string; code?: string; total?: number } | null>(null);
  const unreadCountRef = useRef(0);
  const lastProcessedIdRef = useRef<string | null>(null);

  const triggerAlert = useCallback(
    (order: { id: string; code?: string; total?: number }) => {
      if (lastProcessedIdRef.current === order.id) return;
      lastProcessedIdRef.current = order.id;

      setNewOrder(order);

      // 1. Sonnerie distinctive de caisse / carillon
      playOrderChime();

      // 2. Vibration haptique sur téléphone
      triggerHapticFeedback();

      // 3. Badge rouge sur l'icône de l'application PWA + Favicon + Titre document
      unreadCountRef.current += 1;
      updateAppBadge(unreadCountRef.current);

      // 4. Notification système native sur l'appareil (Mobile Android via Service Worker & PC)
      const formattedTotal = order.total ? ` • ${formatFCFA(order.total)}` : "";
      sendSystemNotification("Nouvelle commande reçue ! 🔔", {
        body: `Commande #${order.code || ""}${formattedTotal} enregistrée dans votre boutique.`,
        tag: `order-${order.id}`,
      });

      // 5. Actualiser la vue en arrière-plan
      router.refresh();
    },
    [router]
  );

  useEffect(() => {
    const supabase = createClient();
    const lastCheckedRef = { current: new Date().toISOString() };

    // 1. Demander la permission de notification au navigateur si par défaut
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }

    // 2. Canal Supabase Realtime WebSocket (déclenchement instantané 0ms)
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
          const order = payload.new as { id: string; public_code?: string; total?: number; created_at?: string };
          if (order.created_at) {
            lastCheckedRef.current = order.created_at;
          }
          triggerAlert({ id: order.id, code: order.public_code, total: order.total });
        }
      )
      .subscribe();

    // 3. Heartbeat de secours (toutes les 12s) : garantit la réception même si le réseau mobile coupe le websocket
    const pollInterval = setInterval(async () => {
      try {
        const { data: latestOrders } = await supabase
          .from("orders")
          .select("id, public_code, total, created_at")
          .eq("shop_id", shopId)
          .gt("created_at", lastCheckedRef.current)
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestOrders && latestOrders.length > 0) {
          const ord = latestOrders[0];
          lastCheckedRef.current = ord.created_at;
          triggerAlert({ id: ord.id, code: ord.public_code, total: ord.total });
        }
      } catch {}
    }, 12000);

    // 4. Rallumage d'écran mobile / retour d'onglet : vérification immédiate
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        try {
          const { data: missedOrders } = await supabase
            .from("orders")
            .select("id, public_code, total, created_at")
            .eq("shop_id", shopId)
            .gt("created_at", lastCheckedRef.current)
            .order("created_at", { ascending: false })
            .limit(1);

          if (missedOrders && missedOrders.length > 0) {
            const ord = missedOrders[0];
            lastCheckedRef.current = ord.created_at;
            triggerAlert({ id: ord.id, code: ord.public_code, total: ord.total });
          }
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      supabase.removeChannel(channel);
    };
  }, [shopId, triggerAlert]);

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
