"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export function RealtimeOrderAlert({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [newOrder, setNewOrder] = useState<{ id: string; code?: string; total?: number } | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Demander la permission de notification au navigateur
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

          // Signal sonore doux (Web Audio synthétisé, aucun fichier externe)
          try {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            const ctx = new AudioCtx();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(587.33, ctx.currentTime); // Ré5
            osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // La5
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
          } catch {
            // Audio context non autorisé avant geste utilisateur (silencieux)
          }

          // Notification système native de l'appareil
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("Nouvelle commande ! 🔔", {
                body: `Commande ${order.public_code || ""} enregistrée dans votre boutique.`,
                icon: "/icon-192.png",
              });
            } catch {}
          }

          // Actualiser la page du tableau de bord
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, router]);

  if (!newOrder) return null;

  return (
    <div
      role="status"
      className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5 text-brand-950 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-xs">
        <Bell className="size-5 animate-bounce" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">Nouvelle commande reçue !</p>
        <p className="text-xs text-brand-800 truncate mt-0.5 font-medium">
          {newOrder.code ? `Code ${newOrder.code}` : "Nouvelle commande client"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Link
          href={`/tableau-de-bord/commandes/${newOrder.id}`}
          onClick={() => setNewOrder(null)}
          className="inline-flex items-center gap-1 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 active:scale-95 transition-all"
        >
          <span>Voir</span>
          <ArrowRight className="size-3" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={() => setNewOrder(null)}
          className="p-1.5 text-brand-700 hover:text-brand-950 rounded-lg transition-colors"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
