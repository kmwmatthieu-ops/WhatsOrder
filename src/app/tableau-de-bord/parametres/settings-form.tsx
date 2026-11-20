"use client";

import { useActionState, useState } from "react";
import { updateShopSettings, removeLogo } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Toggle } from "@/components/ui/toggle";
import { SlugField, type SlugStatus } from "@/components/shop/slug-field";
import { PhoneInput } from "@/components/shop/phone-input";
import { LogoUploader } from "@/components/shop/logo-uploader";
import { splitE164, toE164 } from "@/lib/phone";
import { SHOP_COLOR_PRESETS } from "@/lib/constants";
import type { Shop } from "@/types/database";

export function SettingsForm({ shop }: { shop: Shop }) {
  const [state, action] = useActionState(updateShopSettings, initialActionState);
  
  const [slug, setSlug] = useState(shop.slug);
  const [, setSlugStatus] = useState<SlugStatus>("idle");
  const [phone, setPhone] = useState(() => splitE164(shop.whatsapp_number));
  const [color, setColor] = useState(shop.primary_color);
  const [deliveryEnabled, setDeliveryEnabled] = useState(shop.delivery_enabled);
  const [pickupEnabled, setPickupEnabled] = useState(shop.pickup_enabled);

  const fullWhatsapp = toE164(phone.countryCode, phone.local);

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {state.ok && <Alert tone="success">{state.message}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {/* Section 1 : Identité & Contact */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Identité de la boutique</h2>
        
        <div>
          <label className="text-sm font-semibold mb-2 block">Logo</label>
          <LogoUploader initialUrl={shop.logo_url} onRemove={removeLogo} />
        </div>

        <Input
          label="Nom de la boutique"
          name="name"
          defaultValue={shop.name}
          maxLength={60}
          required
          error={state.fieldErrors?.name}
        />

        <SlugField
          value={slug}
          onChange={setSlug}
          onStatusChange={setSlugStatus}
          error={state.fieldErrors?.slug}
        />
        <input type="hidden" name="slug" value={slug} />

        <PhoneInput
          countryCode={phone.countryCode}
          local={phone.local}
          onChange={setPhone}
          error={state.fieldErrors?.whatsapp_number}
          hint="Numéro recevant les notifications de commande WhatsApp."
        />
        <input type="hidden" name="whatsapp_number" value={fullWhatsapp} />

        <Textarea
          label="Description"
          name="description"
          defaultValue={shop.description ?? ""}
          maxLength={500}
          optional
          hint="Présentez votre boutique à vos clients (500 car. max)."
          error={state.fieldErrors?.description}
        />

        <Input
          label="Adresse physique ou ville"
          name="address"
          defaultValue={shop.address ?? ""}
          maxLength={200}
          optional
          placeholder="Ex. Cocody Angré, Abidjan"
          error={state.fieldErrors?.address}
        />
      </section>

      {/* Section 2 : Personnalisation visuelle */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Couleur principale</h2>
        <p className="text-xs text-muted">Cette couleur sera utilisée sur les boutons et accents de votre boutique publique.</p>

        <div className="flex flex-wrap items-center gap-2">
          {SHOP_COLOR_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setColor(preset)}
              style={{ backgroundColor: preset }}
              className={`size-9 rounded-full transition-transform ${
                color.toLowerCase() === preset.toLowerCase()
                  ? "ring-4 ring-brand-100 scale-110 shadow-sm"
                  : "hover:scale-105"
              }`}
              aria-label={`Couleur ${preset}`}
            />
          ))}
          <div className="flex items-center gap-2 ml-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-9 cursor-pointer rounded-xl border border-line p-0.5 bg-transparent"
              aria-label="Choisir une couleur sur mesure"
            />
            <span className="font-mono text-xs text-muted">{color.toUpperCase()}</span>
          </div>
        </div>
        <input type="hidden" name="primary_color" value={color} />
        {state.fieldErrors?.primary_color && (
          <p className="text-sm text-danger-600">{state.fieldErrors.primary_color}</p>
        )}
      </section>

      {/* Section 3 : Livraison & Retrait */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Modes de commande</h2>
        
        <Toggle
          checked={deliveryEnabled}
          onChange={setDeliveryEnabled}
          name="delivery_enabled"
          label="Livraison à domicile"
          description="Permet aux clients de saisir une adresse de livraison."
        />

        <Toggle
          checked={pickupEnabled}
          onChange={setPickupEnabled}
          name="pickup_enabled"
          label="Retrait en magasin"
          description="Le client vient récupérer sa commande directement."
        />

        {state.fieldErrors?.pickup_enabled && (
          <p className="text-sm text-danger-600">{state.fieldErrors.pickup_enabled}</p>
        )}

        {deliveryEnabled && (
          <div className="pt-2 border-t border-line">
            <Input
              label="Frais de livraison forfaitaires (FCFA)"
              name="delivery_fee"
              type="number"
              min={0}
              step={100}
              defaultValue={shop.delivery_fee}
              hint="0 si la livraison est gratuite. Montant entier en FCFA."
              error={state.fieldErrors?.delivery_fee}
            />
          </div>
        )}
      </section>

      <div className="sticky bottom-20 md:bottom-6 z-10 pt-2">
        <SubmitButton block pendingText="Enregistrement…">
          Enregistrer les modifications
        </SubmitButton>
      </div>
    </form>
  );
}
