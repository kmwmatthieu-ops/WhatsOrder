"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireShop } from "@/lib/supabase/server";
import { productSchema, categoryNameSchema } from "@/lib/validation/product";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET, PRODUCT_LIMIT } from "@/lib/constants";

export async function createProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { shop, supabase } = await requireShop();

  // Vérification préalable du quota des 20 produits
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", shop.id);

  if ((count ?? 0) >= PRODUCT_LIMIT) {
    return { error: "Vous avez atteint la limite de 20 produits du plan gratuit." };
  }

  const imagesRaw = formData.get("images_json");
  let images: string[] = [];
  try {
    images = imagesRaw ? JSON.parse(String(imagesRaw)) : [];
  } catch {
    images = [];
  }

  const rawData = {
    name: formData.get("name"),
    price: formData.get("price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    options_text: formData.get("options_text"),
    stock: formData.get("has_stock") === "on" ? formData.get("stock") : null,
    is_available: formData.get("is_available") === "on",
    images,
  };

  const parsed = productSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { error } = await supabase.from("products").insert({
    ...parsed.data,
    shop_id: shop.id,
  });

  if (error) {
    return { error: dbErrorMessage(error, "Impossible d'ajouter le produit.") };
  }

  revalidatePath("/tableau-de-bord/produits");
  redirect("/tableau-de-bord/produits");
}

export async function updateProduct(
  productId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { shop, supabase } = await requireShop();

  const imagesRaw = formData.get("images_json");
  let images: string[] = [];
  try {
    images = imagesRaw ? JSON.parse(String(imagesRaw)) : [];
  } catch {
    images = [];
  }

  const rawData = {
    name: formData.get("name"),
    price: formData.get("price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    options_text: formData.get("options_text"),
    stock: formData.get("has_stock") === "on" ? formData.get("stock") : null,
    is_available: formData.get("is_available") === "on",
    images,
  };

  const parsed = productSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  const { error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", productId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de modifier le produit.") };
  }

  revalidatePath("/tableau-de-bord/produits");
  redirect("/tableau-de-bord/produits");
}

export async function deleteProduct(productId: string): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  // Récupérer les images pour les purger du storage
  const { data: product } = await supabase
    .from("products")
    .select("images")
    .eq("id", productId)
    .eq("shop_id", shop.id)
    .single();

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Suppression impossible.") };
  }

  if (product?.images && product.images.length > 0) {
    const paths = product.images
      .map(mediaPathFromUrl)
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    }
  }

  revalidatePath("/tableau-de-bord/produits");
  return {};
}

export async function toggleProductAvailability(
  productId: string,
  isAvailable: boolean
): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const { error } = await supabase
    .from("products")
    .update({ is_available: isAvailable })
    .eq("id", productId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error) };
  }

  revalidatePath("/tableau-de-bord/produits");
  return {};
}

// ==========================================
// Gestion des catégories
// ==========================================

export async function createCategory(name: string): Promise<{ error?: string; categoryId?: string }> {
  const { shop, supabase } = await requireShop();

  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom de catégorie invalide." };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({ shop_id: shop.id, name: parsed.data })
    .select("id")
    .single();

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de créer la catégorie.") };
  }

  revalidatePath("/tableau-de-bord/produits");
  return { categoryId: data.id };
}

export async function updateCategory(categoryId: string, name: string): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const parsed = categoryNameSchema.safeParse(name);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Nom de catégorie invalide." };
  }

  const { error } = await supabase
    .from("categories")
    .update({ name: parsed.data })
    .eq("id", categoryId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de renommer la catégorie.") };
  }

  revalidatePath("/tableau-de-bord/produits");
  return {};
}

export async function deleteCategory(categoryId: string): Promise<{ error?: string }> {
  const { shop, supabase } = await requireShop();

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de supprimer la catégorie.") };
  }

  revalidatePath("/tableau-de-bord/produits");
  return {};
}
