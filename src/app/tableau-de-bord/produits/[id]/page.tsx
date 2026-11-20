import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireShop } from "@/lib/supabase/server";
import { ProductForm } from "@/components/products/product-form";
import { updateProduct, deleteProduct } from "../actions";

export const metadata: Metadata = { title: "Modifier le produit" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { shop, supabase } = await requireShop();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).eq("shop_id", shop.id).maybeSingle(),
    supabase.from("categories").select("*").eq("shop_id", shop.id).order("name"),
  ]);

  if (!product) notFound();

  const boundUpdate = updateProduct.bind(null, product.id);
  const boundDelete = deleteProduct.bind(null, product.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Modifier le produit</h1>
        <p className="text-muted text-sm">{product.name}</p>
      </div>

      <ProductForm
        product={product}
        categories={categories ?? []}
        action={boundUpdate}
        onDelete={boundDelete}
      />
    </div>
  );
}
