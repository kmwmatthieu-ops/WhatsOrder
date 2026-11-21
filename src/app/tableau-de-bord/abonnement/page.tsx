import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { getShopSubscriptionMetrics, getActiveSubscriptionPlans } from "@/lib/subscription";
import { SubscriptionView } from "./subscription-view";

export const metadata: Metadata = {
  title: "Abonnement & Consommation — Bon Waz à Dealer",
};

export default async function AbonnementPage() {
  const { shop } = await requireShop();
  const [metrics, plans] = await Promise.all([
    getShopSubscriptionMetrics(shop.id),
    getActiveSubscriptionPlans(),
  ]);

  return <SubscriptionView shop={shop} metrics={metrics} plans={plans} />;
}
