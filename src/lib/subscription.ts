import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan, ShopSubscription, SubscriptionRequest } from "@/types/database";

export type ResolvedSubscription = {
  subscription: ShopSubscription | null;
  effectivePlan: SubscriptionPlan;
  actualPlan: SubscriptionPlan;
  isExpired: boolean;
  daysRemaining: number | null;
};

export type ShopSubscriptionMetrics = {
  resolved: ResolvedSubscription;
  productsCount: number;
  monthlyOrdersCount: number;
  pendingRequest: SubscriptionRequest | null;
  historyRequests: SubscriptionRequest[];
};

/**
 * Récupère tous les plans actifs ordonnés pour la page Tarifs ou le sélecteur.
 */
export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (data as SubscriptionPlan[]) ?? [];
}

/**
 * Récupère l'abonnement et le plan effectif d'une boutique.
 * En cas d'expiration d'un plan payant, bascule automatiquement et de manière non destructive
 * sous les limites du plan Gratuit tout en conservant toutes les données.
 */
export async function getShopSubscription(shopId: string): Promise<ResolvedSubscription> {
  const supabase = await createClient();

  // 1. Récupère tous les plans en cache local
  const plans = await getActiveSubscriptionPlans();
  const gratuitPlan = plans.find((p) => p.id === "gratuit") || {
    id: "gratuit",
    name: "Gratuit",
    description: "Idéal pour démarrer",
    price_monthly: 0,
    max_products: 5,
    max_orders_per_month: 10,
    has_advanced_stats: false,
    has_csv_export: false,
    has_order_email_notifications: false,
    visibility_multiplier: 1.0,
    has_certified_badge: false,
    badge: "Découverte",
    is_active: true,
    sort_order: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // 2. Récupère l'abonnement de la boutique
  const { data: subData } = await supabase
    .from("shop_subscriptions")
    .select("*")
    .eq("shop_id", shopId)
    .maybeSingle();

  const subscription = (subData as ShopSubscription | null) ?? null;
  if (!subscription) {
    return {
      subscription: null,
      effectivePlan: gratuitPlan,
      actualPlan: gratuitPlan,
      isExpired: false,
      daysRemaining: null,
    };
  }

  const actualPlan = plans.find((p) => p.id === subscription.plan_id) || gratuitPlan;

  // Calcul d'expiration
  let isExpired = false;
  let daysRemaining: number | null = null;

  if (subscription.plan_id !== "gratuit" && subscription.expires_at) {
    const expiresDate = new Date(subscription.expires_at);
    const now = new Date();
    const diffMs = expiresDate.getTime() - now.getTime();
    if (diffMs <= 0) {
      isExpired = true;
      daysRemaining = 0;
    } else {
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  return {
    subscription,
    effectivePlan: isExpired ? gratuitPlan : actualPlan,
    actualPlan,
    isExpired,
    daysRemaining,
  };
}

/**
 * Calcule l'ensemble des métriques de consommation de la boutique (produits, commandes du mois, demandes).
 */
export async function getShopSubscriptionMetrics(shopId: string): Promise<ShopSubscriptionMetrics> {
  const supabase = await createClient();

  const [resolved, productsRes, ordersRes, pendingRes, historyRes] = await Promise.all([
    getShopSubscription(shopId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shopId)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    supabase
      .from("subscription_requests")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("subscription_requests")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return {
    resolved,
    productsCount: productsRes.count ?? 0,
    monthlyOrdersCount: ordersRes.count ?? 0,
    pendingRequest: (pendingRes.data as SubscriptionRequest | null) ?? null,
    historyRequests: (historyRes.data as SubscriptionRequest[]) ?? [],
  };
}

/**
 * Règle V3-C d'éligibilité au badge certifié :
 * 1. L'identité de la boutique doit être vérifiée par l'administrateur
 * 2. Le forfait actif doit accorder le droit au badge (ex: Premium)
 * 3. L'abonnement doit être actif et non expiré
 */
export function isShopCertifiedBadgeEligible(
  identityVerified: boolean,
  resolvedSub: ResolvedSubscription
): boolean {
  if (!identityVerified) return false;
  if (resolvedSub.isExpired) return false;
  return Boolean(resolvedSub.effectivePlan.has_certified_badge);
}

/**
 * Récupère un réglage de la plateforme depuis public.platform_settings.
 */
export async function getPlatformSetting(key: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return data?.value ?? null;
}
