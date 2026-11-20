import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireShop } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";
import { createProduct } from "../actions";
import { PRODUCT_LIMIT } from "@/lib/constants";

export const metadata: Metadata = { title: "Nouveau produit" };

export default async function NewProductPage() {
  const { shop, supabase } = await requireShop();

  // Vérifier si la limite des 20 produits est déjà atteinte
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shop.id);

  if ((count ?? 0) >= PRODUCT_LIMIT) {
    redirect("/tableau-de-bord/produits");
  }

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("shop_id", shop.id)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Nouveau produit</h1>
        <p className="text-muted text-sm">Ajoutez un article à votre boutique WhatsApp.</p>
      </div>

      <ProductForm
        categories={categories ?? []}
        action={createProduct}
      />
    </div>
  );
}
