import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { ShopHeader } from "@/components/public/shop-header";
import { PublicCatalog } from "@/components/public/public-catalog";
import { AlertTriangle } from "lucide-react";

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
    .select("name, description, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop) return { title: "Boutique introuvable" };

  return {
    title: `${shop.name} · Boutique en ligne`,
    description: shop.description || `Commandez directement sur WhatsApp chez ${shop.name}.`,
    openGraph: {
      title: `${shop.name} · Boutique en ligne`,
      description: shop.description || `Commandez directement sur WhatsApp chez ${shop.name}.`,
      images: shop.logo_url ? [{ url: shop.logo_url }] : [],
    },
  };
}

export default async function PublicShopPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  // Récupérer la boutique
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!shop) notFound();

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

  // Récupérer les catégories et les produits
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("shop_id", shop.id).order("name"),
    supabase
      .from("products")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <CartProvider shopId={shop.id}>
      <div className="min-h-dvh bg-cream text-ink">
        <ShopHeader shop={shop} />
        <PublicCatalog
          shop={shop}
          categories={categories ?? []}
          products={products ?? []}
        />
      </div>
    </CartProvider>
  );
}
