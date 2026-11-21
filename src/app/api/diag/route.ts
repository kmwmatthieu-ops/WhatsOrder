import { NextResponse } from "next/server";
import { getSupabaseCredentials } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const creds = getSupabaseCredentials();
  const supabase = await createClient();
  const { data: shops, error } = await supabase.from("shops").select("id, name, slug, status").limit(5);

  return NextResponse.json({
    credentials: { url: creds.url, keyPrefix: creds.key.slice(0, 15) },
    error: error ? { message: error.message, code: error.code } : null,
    shops,
  });
}
