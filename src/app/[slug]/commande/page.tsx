import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { CheckoutForm } from "./checkout-form";
import type { DeliveryZone } from "@/types/database";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Commander · ${slug}` };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (!shop) notFound();

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("shop_id", shop.id)
    .order("name");

  return (
    <CartProvider shopId={shop.id}>
      <main className="mx-auto min-h-dvh max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <a
            href={`/${shop.slug}`}
            className="relative z-10 grid size-10 shrink-0 place-items-center rounded-2xl border border-line bg-white shadow-xs text-ink hover:bg-sand active:scale-95 transition-all cursor-pointer"
            aria-label="Retour à la boutique"
          >
            <ArrowLeft className="size-5" />
          </a>
          <a href={`/${shop.slug}`} className="min-w-0 group cursor-pointer">
            <h1 className="text-xl font-extrabold text-ink group-hover:text-brand-700 transition-colors">
              Finaliser ma commande
            </h1>
            <p className="text-xs text-muted truncate">{shop.name}</p>
          </a>
        </div>

        <CheckoutForm shop={shop} zones={(zones as DeliveryZone[]) ?? []} />
      </main>
    </CartProvider>
  );
}
