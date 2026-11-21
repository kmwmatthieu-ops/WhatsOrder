"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { updateShopSettings, removeLogo, removeBanner } from "./actions";
import { initialActionState } from "@/lib/action-state";
import { Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Toggle } from "@/components/ui/toggle";
import { SlugField, type SlugStatus } from "@/components/shop/slug-field";
import { PhoneInput } from "@/components/shop/phone-input";
import { LogoUploader } from "@/components/shop/logo-uploader";
import { BannerUploader } from "@/components/shop/banner-uploader";
import { OpeningHoursEditor } from "@/components/shop/opening-hours-editor";
import { DeliveryZonesManager } from "@/components/shop/delivery-zones-manager";
import { DeleteShopModal } from "@/components/shop/delete-shop-modal";
import { splitE164, toE164 } from "@/lib/phone";
import { SHOP_COLOR_PRESETS } from "@/lib/constants";
import { DEFAULT_OPENING_HOURS } from "@/lib/opening-hours";
import type { Shop, DeliveryZone, OpeningHours } from "@/types/database";

type Props = {
  shop: Shop;
  initialZones: DeliveryZone[];
};

export function SettingsForm({ shop, initialZones }: Props) {
  const [state, action] = useActionState(updateShopSettings, initialActionState);
  
  const [slug, setSlug] = useState(shop.slug);
  const [, setSlugStatus] = useState<SlugStatus>("idle");
  const [phone, setPhone] = useState(() => splitE164(shop.whatsapp_number));
  const [color, setColor] = useState(shop.primary_color);
  const [deliveryEnabled, setDeliveryEnabled] = useState(shop.delivery_enabled);
  const [pickupEnabled, setPickupEnabled] = useState(shop.pickup_enabled);
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    shop.opening_hours || DEFAULT_OPENING_HOURS
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const fullWhatsapp = toE164(phone.countryCode, phone.local);

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-6" noValidate>
        {state.ok && <Alert tone="success">{state.message}</Alert>}
        {state.error && <Alert tone="error">{state.error}</Alert>}

        {/* Section 1 : Identité & Contact */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink">Identité de la boutique</h2>
          
          <div>
            <label className="text-sm font-semibold mb-2 block">Logo</label>
            <LogoUploader initialUrl={shop.logo_url} onRemove={removeLogo} />
          </div>

          <div>
            <label className="text-sm font-semibold mb-2 block">Bannière d&apos;en-tête</label>
            <BannerUploader initialUrl={shop.banner_url} onRemove={removeBanner} />
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

        {/* Section 2 : Horaires d'ouverture */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink">Horaires d&apos;ouverture</h2>
          <OpeningHoursEditor value={openingHours} onChange={setOpeningHours} />
          <input type="hidden" name="opening_hours" value={JSON.stringify(openingHours)} />
        </section>

        {/* Section 3 : Personnalisation visuelle */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
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

        {/* Section 4 : Modes de commande */}
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
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
                label="Frais de livraison forfaitaires par défaut (FCFA)"
                name="delivery_fee"
                type="number"
                min={0}
                step={1}
                defaultValue={shop.delivery_fee}
                hint="Utilisé si aucune zone personnalisée n'est configurée ci-dessous. 0 si gratuit."
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

      {/* Section 5 : Zones de livraison personnalisées (Gérées indépendamment pour réactivité immédiate) */}
      {deliveryEnabled && (
        <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-4">
          <div>
            <h2 className="text-base font-bold text-ink">Zones de livraison multiples</h2>
            <p className="text-xs text-muted mt-0.5">
              Si vous définissez des zones, vos clients devront obligatoirement choisir leur quartier lors de la commande et le tarif associé s&apos;appliquera.
            </p>
          </div>
          <DeliveryZonesManager initialZones={initialZones} />
        </section>
      )}

      {/* Section 6 : Zone de danger (Suppression irréversible de la boutique) */}
      <section className="rounded-2xl sm:rounded-3xl border border-danger-200 bg-danger-50/50 p-4 sm:p-6 shadow-xs flex flex-col gap-4 mb-6 sm:mb-2">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex size-9 sm:size-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-danger-100 text-danger-700">
              <AlertTriangle className="size-4 sm:size-5" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-danger-900">
              Zone de danger : Supprimer la boutique
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-danger-800/90 leading-relaxed">
            Cette action est irréversible. La suppression effacera définitivement votre boutique, son catalogue de produits, ses variantes, ses clients, ses commandes et ses règlements. Votre compte utilisateur reste actif et vous pourrez immédiatement créer une nouvelle boutique.
          </p>
        </div>

        <div className="pt-3 border-t border-danger-200/60 flex flex-col sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-danger-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-danger-700 active:scale-[0.99] transition-all"
          >
            <Trash2 className="size-4 shrink-0" />
            <span>Supprimer définitivement cette boutique</span>
          </button>
        </div>
      </section>

      <DeleteShopModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        shopId={shop.id}
        shopName={shop.name}
      />
    </div>
  );
}
