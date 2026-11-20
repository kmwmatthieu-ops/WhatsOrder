"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Truck, Store as StoreIcon, ShieldCheck } from "lucide-react";
import { submitOrder, type OrderPlacementResult } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { useCart } from "@/lib/cart/cart-context";
import { formatFCFA } from "@/lib/format";
import { DEFAULT_COUNTRY_CODE, isValidE164, toE164 } from "@/lib/phone";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { PhoneInput } from "@/components/shop/phone-input";
import type { Shop } from "@/types/database";

export function CheckoutForm({ shop }: { shop: Shop }) {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCart();

  const boundSubmit = submitOrder.bind(null, shop.slug);
  const [state, action] = useActionState<OrderPlacementResult, FormData>(
    boundSubmit,
    initialActionState
  );

  const [phone, setPhone] = useState({ countryCode: DEFAULT_COUNTRY_CODE, local: "" });
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">(
    shop.delivery_enabled ? "delivery" : "pickup"
  );
  const [phoneError, setPhoneError] = useState("");

  const isDelivery = fulfillment === "delivery";
  const deliveryFee = isDelivery ? shop.delivery_fee : 0;
  const grandTotal = subtotal + deliveryFee;
  const fullWhatsapp = toE164(phone.countryCode, phone.local);

  useEffect(() => {
    if (state.ok && state.publicCode) {
      clearCart();
      router.replace(`/${shop.slug}/commande/${state.publicCode}`);
    }
  }, [state, router, shop.slug, clearCart]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white p-8 text-center my-6">
        <p className="font-bold text-ink text-base">Votre panier est vide</p>
        <p className="text-xs text-muted mt-1">Ajoutez des articles avant de passer commande.</p>
        <Link
          href={`/${shop.slug}`}
          className="mt-4 rounded-2xl px-5 py-2.5 text-xs font-bold text-white shadow-xs"
          style={{ backgroundColor: shop.primary_color }}
        >
          Retour à la boutique
        </Link>
      </div>
    );
  }

  function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (!isValidE164(fullWhatsapp)) {
      e.preventDefault();
      setPhoneError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    setPhoneError("");
  }

  return (
    <form action={action} onSubmit={handleFormSubmit} className="flex flex-col gap-6" noValidate>
      {/* Honeypot anti-spam caché */}
      <input type="text" name="hp_check" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {/* JSON des articles */}
      <input
        type="hidden"
        name="items_json"
        value={JSON.stringify(
          items.map((i) => ({
            product_id: i.productId,
            quantity: i.quantity,
            selected_options: i.selectedOptions ?? null,
          }))
        )}
      />

      <input type="hidden" name="customer_phone" value={fullWhatsapp} />
      <input type="hidden" name="fulfillment" value={fulfillment} />

      {state.error && <Alert tone="error">{state.error}</Alert>}

      {/* 1. Coordonnées client */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Vos coordonnées</h2>

        <Input
          label="Votre nom complet"
          name="customer_name"
          placeholder="Ex. Marie Koné"
          autoComplete="name"
          required
          error={state.fieldErrors?.customer_name}
        />

        <PhoneInput
          countryCode={phone.countryCode}
          local={phone.local}
          onChange={(p) => {
            setPhone(p);
            setPhoneError("");
          }}
          label="Votre numéro de téléphone (WhatsApp)"
          hint="Le commerçant pourra vous contacter pour la confirmation."
          error={phoneError || state.fieldErrors?.customer_phone}
        />
      </section>

      {/* 2. Mode de livraison / retrait */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Mode de réception</h2>

        <div className="grid grid-cols-2 gap-2">
          {shop.delivery_enabled && (
            <button
              type="button"
              onClick={() => setFulfillment("delivery")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all ${
                fulfillment === "delivery"
                  ? "border-brand-600 bg-brand-50/50 shadow-xs font-bold text-brand-700"
                  : "border-line bg-white text-ink hover:bg-sand/40"
              }`}
            >
              <Truck className="size-5" />
              <span className="text-xs">Livraison à domicile</span>
              {shop.delivery_fee > 0 ? (
                <span className="text-[11px] text-muted font-normal">{formatFCFA(shop.delivery_fee)}</span>
              ) : (
                <span className="text-[11px] text-success-600 font-bold">Gratuite</span>
              )}
            </button>
          )}

          {shop.pickup_enabled && (
            <button
              type="button"
              onClick={() => setFulfillment("pickup")}
              className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-center transition-all ${
                fulfillment === "pickup"
                  ? "border-brand-600 bg-brand-50/50 shadow-xs font-bold text-brand-700"
                  : "border-line bg-white text-ink hover:bg-sand/40"
              }`}
            >
              <StoreIcon className="size-5" />
              <span className="text-xs">Retrait en magasin</span>
              <span className="text-[11px] text-success-600 font-bold">Gratuit</span>
            </button>
          )}
        </div>

        {isDelivery && (
          <div className="pt-2">
            <Input
              label="Adresse complète de livraison"
              name="delivery_address"
              placeholder="Ex. Cocody Angré, Cité Star 5, Villa 12"
              required
              hint="Commune, quartier, repère pour le livreur."
              error={state.fieldErrors?.delivery_address}
            />
          </div>
        )}

        <Textarea
          label="Instructions particulières"
          name="customer_note"
          placeholder="Ex. Appelez-moi avant de venir, sonnette en panne…"
          optional
          maxLength={500}
          error={state.fieldErrors?.customer_note}
        />
      </section>

      {/* 3. Récapitulatif de la commande */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted">Récapitulatif ({items.length})</h2>

        <div className="divide-y divide-line">
          {items.map((item) => (
            <div key={`${item.productId}-${item.selectedOptions ?? ""}`} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="font-bold text-brand-700 shrink-0">{item.quantity}x</span>
                <span className="truncate text-ink font-semibold">{item.name}</span>
                {item.selectedOptions && (
                  <span className="truncate text-muted text-[11px]">({item.selectedOptions})</span>
                )}
              </div>
              <span className="font-bold text-ink shrink-0">{formatFCFA(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-line pt-3 flex flex-col gap-1.5 text-xs sm:text-sm">
          <div className="flex justify-between text-muted">
            <span>Sous-total</span>
            <span>{formatFCFA(subtotal)}</span>
          </div>

          <div className="flex justify-between text-muted">
            <span>Frais de livraison</span>
            <span>{isDelivery ? formatFCFA(deliveryFee) : "Gratuit"}</span>
          </div>

          <div className="flex justify-between text-base font-extrabold text-ink pt-2 border-t border-line">
            <span>Total à payer</span>
            <span style={{ color: shop.primary_color }}>{formatFCFA(grandTotal)}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 rounded-xl bg-sand/60 p-2.5 text-[11px] text-muted">
          <ShieldCheck className="size-4 shrink-0 text-success-600" />
          <span>Commande directe auprès du vendeur. Paiement à la livraison ou retrait.</span>
        </div>
      </section>

      {/* Validation */}
      <div className="sticky bottom-4 z-20">
        <SubmitButton
          block
          style={{ backgroundColor: shop.primary_color }}
          pendingText="Validation de votre commande…"
        >
          Valider ma commande ({formatFCFA(grandTotal)})
        </SubmitButton>
      </div>
    </form>
  );
}
