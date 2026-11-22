"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { FollowedShop, ExplorerProduct } from "@/types/database";

export async function toggleFollowShopAction(shopId: string): Promise<{
  success: boolean;
  following?: boolean;
  followersCount?: number;
  error?: string;
  requiresAuth?: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, requiresAuth: true, error: "Connexion requise pour suivre cette boutique" };
    }

    const { data, error } = await supabase.rpc("toggle_follow_shop", {
      p_shop_id: shopId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const result = data as { following: boolean; followers_count: number };

    revalidatePath("/explorer");
    revalidatePath("/compte/boutiques");
    revalidatePath("/tableau-de-bord");

    return {
      success: true,
      following: result.following,
      followersCount: result.followers_count,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inattendue";
    return { success: false, error: msg };
  }
}

export async function getFollowedShopIdsAction(): Promise<string[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from("shop_followers")
      .select("shop_id")
      .eq("user_id", user.id);

    return (data || []).map((row) => row.shop_id);
  } catch {
    return [];
  }
}

export async function getMyFollowedShopsAction(): Promise<FollowedShop[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_my_followed_shops");
    if (error) throw error;
    return (data as FollowedShop[]) || [];
  } catch {
    return [];
  }
}

export async function getFollowedShopsProductsAction(
  limit = 30,
  offset = 0
): Promise<ExplorerProduct[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_followed_shops_products", {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return (data as ExplorerProduct[]) || [];
  } catch {
    return [];
  }
}
