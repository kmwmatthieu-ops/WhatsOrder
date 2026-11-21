import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = await createClient();
  const { data: shops, error } = await supabase.from("shops").select("id, name, slug, status").limit(5);

  return NextResponse.json({
    supabaseUrl: url,
    keyPrefix: key ? key.slice(0, 15) : null,
    error: error ? { message: error.message, code: error.code, details: error.details } : null,
    shops,
  });
}
