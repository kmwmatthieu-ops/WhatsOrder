import type { Metadata } from "next";
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
      <SettingsForm shop={shop} initialZones={(zones as DeliveryZone[]) ?? []} />
    </div>
  );
}
