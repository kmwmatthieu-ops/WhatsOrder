import type { Metadata } from "next";
import { requireShop } from "@/lib/supabase/server";
import { ProductsView } from "@/components/products/products-view";
import type { ProductWithVariants } from "@/types/database";

export const metadata: Metadata = { title: "Gestion des produits" };

export default async function ProductsPage() {
  const { shop, supabase } = await requireShop();

  // Récupérer les catégories et les produits (avec leurs variantes V2-C)
  const [{ data: categories }, { data: products }] = await Promise.all([
    supabase.from("categories").select("*").eq("shop_id", shop.id).order("name"),
    supabase
      .from("products")
      .select("*, product_variants(*)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ProductsView
      products={(products as ProductWithVariants[]) ?? []}
      categories={categories ?? []}
    />
  );
}
