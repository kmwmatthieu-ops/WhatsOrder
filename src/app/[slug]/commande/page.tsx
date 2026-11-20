import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CartProvider } from "@/lib/cart/cart-context";
import { CheckoutForm } from "./checkout-form";

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

  return (
    <CartProvider shopId={shop.id}>
      <main className="mx-auto min-h-dvh max-w-lg px-4 py-6">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={`/${shop.slug}`}
            className="grid size-10 place-items-center rounded-2xl border border-line bg-white shadow-xs text-ink hover:bg-sand"
            aria-label="Retour à la boutique"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-ink">Finaliser ma commande</h1>
            <p className="text-xs text-muted">{shop.name}</p>
          </div>
        </div>

        <CheckoutForm shop={shop} />
      </main>
    </CartProvider>
  );
}
