"use server";

import { revalidatePath } from "next/cache";
import { requireShop } from "@/lib/supabase/server";
import { productSchema, categoryNameSchema, type ProductVariantInput } from "@/lib/validation/product";
import { dbErrorMessage } from "@/lib/errors";
import { toFieldErrors, type ActionState } from "@/lib/action-state";
import { mediaPathFromUrl } from "@/lib/storage";
import { MEDIA_BUCKET, PRODUCT_LIMIT } from "@/lib/constants";

function parseJsonArray<T>(raw: FormDataEntryValue | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function hasDuplicateVariantLabels(variants: ProductVariantInput[]): boolean {
  const seen = new Set<string>();
  for (const v of variants) {
    const key = v.label.trim().toLowerCase();
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

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

  const images = parseJsonArray<string>(formData.get("images_json"));
  const variants = parseJsonArray<ProductVariantInput>(formData.get("variants_json"));

  const rawData = {
    name: formData.get("name"),
    price: formData.get("price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    options_text: null,
    stock: variants.length === 0 && formData.get("has_stock") === "on" ? formData.get("stock") : null,
    is_available: formData.get("is_available") === "on",
    images,
    variants,
  };

  const parsed = productSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (hasDuplicateVariantLabels(parsed.data.variants)) {
    return { error: "Deux variantes ne peuvent pas avoir exactement le même nom." };
  }

  const { variants: validatedVariants, ...productFields } = parsed.data;

  const { data: createdProduct, error } = await supabase
    .from("products")
    .insert({
      ...productFields,
      shop_id: shop.id,
    })
    .select("id")
    .single();

  if (error || !createdProduct) {
    return { error: dbErrorMessage(error, "Impossible d'ajouter le produit.") };
  }

  if (validatedVariants.length > 0) {
    const rows = validatedVariants.map((v, idx) => ({
      product_id: createdProduct.id,
      shop_id: shop.id,
      label: v.label.trim(),
      attributes: v.attributes ?? {},
      price_override: v.price_override ?? null,
      stock: v.stock ?? null,
      is_available: v.is_available ?? true,
      position: idx,
    }));

    const { error: varErr } = await supabase.from("product_variants").insert(rows);
    if (varErr) {
      await supabase.from("products").delete().eq("id", createdProduct.id);
      return { error: dbErrorMessage(varErr, "Impossible d'enregistrer les variantes du produit.") };
    }
  }

  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/${shop.slug}`);
  return { ok: true };
}

export async function updateProduct(
  productId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { shop, supabase } = await requireShop();

  const images = parseJsonArray<string>(formData.get("images_json"));
  const variants = parseJsonArray<ProductVariantInput>(formData.get("variants_json"));

  const rawData = {
    name: formData.get("name"),
    price: formData.get("price"),
    category_id: formData.get("category_id"),
    description: formData.get("description"),
    options_text: null,
    stock: variants.length === 0 && formData.get("has_stock") === "on" ? formData.get("stock") : null,
    is_available: formData.get("is_available") === "on",
    images,
    variants,
  };

  const parsed = productSchema.safeParse(rawData);
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error.issues) };
  }

  if (hasDuplicateVariantLabels(parsed.data.variants)) {
    return { error: "Deux variantes ne peuvent pas avoir exactement le même nom." };
  }

  const { variants: validatedVariants, ...productFields } = parsed.data;

  const { error } = await supabase
    .from("products")
    .update(productFields)
    .eq("id", productId)
    .eq("shop_id", shop.id);

  if (error) {
    return { error: dbErrorMessage(error, "Impossible de modifier le produit.") };
  }

  // Synchronisation différentielle des variantes (conserve les IDs existants pour l'historique des commandes)
  const { data: existingRows } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId)
    .eq("shop_id", shop.id);

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const keptIds = new Set(
    validatedVariants.map((v) => v.id).filter((id): id is string => Boolean(id && existingIds.has(id)))
  );

  const idsToDelete = [...existingIds].filter((id) => !keptIds.has(id));
  if (idsToDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("product_variants")
      .delete()
      .in("id", idsToDelete)
      .eq("product_id", productId)
      .eq("shop_id", shop.id);
    if (delErr) {
      return { error: dbErrorMessage(delErr, "Impossible de mettre à jour les variantes.") };
    }
  }

  for (let idx = 0; idx < validatedVariants.length; idx++) {
    const v = validatedVariants[idx];
    const payload = {
      product_id: productId,
      shop_id: shop.id,
      label: v.label.trim(),
      attributes: v.attributes ?? {},
      price_override: v.price_override ?? null,
      stock: v.stock ?? null,
      is_available: v.is_available ?? true,
      position: idx,
    };

    if (v.id && existingIds.has(v.id)) {
      const { error: updErr } = await supabase
        .from("product_variants")
        .update(payload)
        .eq("id", v.id)
        .eq("product_id", productId)
        .eq("shop_id", shop.id);
      if (updErr) {
        return { error: dbErrorMessage(updErr, "Impossible de modifier une variante.") };
      }
    } else {
      const { error: insErr } = await supabase.from("product_variants").insert(payload);
      if (insErr) {
        return { error: dbErrorMessage(insErr, "Impossible d'ajouter une nouvelle variante.") };
      }
    }
  }

  revalidatePath("/tableau-de-bord/produits");
  revalidatePath(`/tableau-de-bord/produits/${productId}`);
  revalidatePath(`/${shop.slug}`);
  return { ok: true };
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
  revalidatePath(`/${shop.slug}`);
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
  revalidatePath(`/${shop.slug}`);
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
