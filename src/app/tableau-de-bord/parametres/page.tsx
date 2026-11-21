import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ArrowRight } from "lucide-react";
import { requireShop } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import type { DeliveryZone } from "@/types/database";

export const metadata: Metadata = { title: "Paramètres de la boutique" };

export default async function SettingsPage() {
  const { shop, supabase } = await requireShop();

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("shop_id", shop.id)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Paramètres</h1>
        <p className="text-muted text-sm">Gérez les coordonnées, options de livraison, horaires et le style de votre boutique.</p>
      </div>

      <Link
        href="/tableau-de-bord/abonnement"
        className="flex items-center justify-between rounded-3xl border border-line bg-white p-5 shadow-xs hover:border-brand-600 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
            <CreditCard className="size-6" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Mon Abonnement & Limites</h2>
            <p className="text-xs text-muted">Consultez votre formule, vos quotas de produits et vos commandes mensuelles.</p>
          </div>
        </div>
        <ArrowRight className="size-5 text-muted group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
      </Link>

      <SettingsForm shop={shop} initialZones={(zones as DeliveryZone[]) ?? []} />
    </div>
  );
}
