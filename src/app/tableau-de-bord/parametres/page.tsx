import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Paramètres de la boutique" };

export default async function SettingsPage() {
  const { shop } = await requireShop();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Paramètres</h1>
        <p className="text-muted text-sm">Gérez les coordonnées, options de livraison et le style de votre boutique.</p>
      </div>
      <SettingsForm shop={shop} />
    </div>
  );
}
