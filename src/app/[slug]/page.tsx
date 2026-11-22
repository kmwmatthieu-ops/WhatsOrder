import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getShopSubscription, isShopCertifiedBadgeEligible } from "@/lib/subscription";
import { CartProvider } from "@/lib/cart/cart-context";
import { ShopHeader } from "@/components/public/shop-header";
import { PublicCatalog } from "@/components/public/public-catalog";
import { AlertTriangle } from "lucide-react";
import type { ProductWithVariants } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
};

/**
 * SEO & Partage WhatsApp / Réseaux Sociaux :
 * Fournit les balises Open Graph avec le logo et la description de la boutique.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("name, description, logo_url, banner_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop) return { title: "Boutique introuvable" };

  const ogImages: { url: string }[] = [];
  if (shop.banner_url) ogImages.push({ url: shop.banner_url });
  else if (shop.logo_url) ogImages.push({ url: shop.logo_url });

  return {
    title: `${shop.name} · Boutique en ligne`,
    description: shop.description || `Commandez directement sur WhatsApp chez ${shop.name}.`,
    openGraph: {
      title: `${shop.name} · Boutique en ligne`,
      description: shop.description || `Commandez directement sur WhatsApp chez ${shop.name}.`,
      images: ogImages,
    },
  };
}

export default async function PublicShopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Récupérer la boutique
  const { data: rawShop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!rawShop) notFound();

  // Résoudre dynamiquement le statut certifié (V3-C : identité vérifiée + abonnement actif éligible)
  const resolvedSub = await getShopSubscription(rawShop.id);
  const isCertified = isShopCertifiedBadgeEligible(rawShop.identity_verified, resolvedSub);
  const shop = { ...rawShop, is_certified: isCertified };

  // Boutique suspendue : affichage public sobre
  if (shop.status === "suspended") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="grid size-16 place-items-center rounded-3xl bg-sand text-muted mb-4">
          <AlertTriangle className="size-8" />
        </div>
        <h1 className="text-xl font-extrabold text-ink">{shop.name}</h1>
        <p className="mt-2 text-sm text-muted">
          Cette boutique est momentanément indisponible. Veuillez revenir un peu plus tard.
        </p>
      </main>
    );
  }

  // Récupérer les catégories et les produits (avec leurs variantes structurées V2-C)
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("shop_id", shop.id).order("name"),
    supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false }),
  ]);

  const typedProducts = ((products as ProductWithVariants[]) ?? []).map((p) => ({
    ...p,
    product_variants: [...(p.product_variants ?? [])].sort((a, b) => a.position - b.position),
  }));

  const { data: { user } } = await supabase.auth.getUser();
  let initialFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from("shop_followers")
      .select("id")
      .eq("user_id", user.id)
      .eq("shop_id", shop.id)
      .maybeSingle();
    initialFollowing = Boolean(follow);
  }

  return (
    <CartProvider shopId={shop.id}>
      <div className="min-h-dvh bg-cream text-ink">
        <ShopHeader shop={shop} initialFollowing={initialFollowing} />
        <PublicCatalog
          shop={shop}
          categories={categories ?? []}
          products={typedProducts}
        />
      </div>
    </CartProvider>
  );
}
