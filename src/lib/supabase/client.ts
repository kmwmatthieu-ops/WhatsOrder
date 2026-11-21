"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseCredentials } from "@/lib/constants";
import type { Database } from "@/types/database";

/** Client Supabase côté navigateur (session lue depuis les cookies). */
export function createClient() {
  const { url, key } = getSupabaseCredentials();
  return createBrowserClient<Database>(url, key);
}
