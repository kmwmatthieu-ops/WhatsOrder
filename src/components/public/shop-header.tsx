import Image from "next/image";
import Link from "next/link";
import { MapPin, Truck, Store as StoreIcon, ArrowLeft, BadgeCheck, Users } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ShopHoursBadge } from "./shop-hours-badge";
import { FollowShopButton } from "@/components/shops/follow-shop-button";
import type { Shop } from "@/types/database";

interface ShopHeaderProps {
  shop: Shop;
  initialFollowing?: boolean;
}

export function ShopHeader({ shop, initialFollowing = false }: ShopHeaderProps) {
  const cleanWhatsapp = shop.whatsapp_number.replace(/\D/g, "");
  const whatsappChatUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Bonjour ${shop.name}, j'ai une question sur votre boutique !`
  )}`;

  return (
    <header className="relative border-b border-line bg-white shadow-xs overflow-hidden">
      {/* Bannière de la boutique */}
      {shop.banner_url && (
        <div className="relative h-32 sm:h-48 md:h-56 w-full bg-sand/80 overflow-hidden">
          <Image
            src={shop.banner_url}
            alt={`Bannière de ${shop.name}`}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        </div>
      )}

      <div className={`mx-auto max-w-4xl px-4 pb-5 ${shop.banner_url ? "pt-3" : "pt-6"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {/* Logo ou icône par défaut */}
            <div
              className={`relative size-16 shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-sand shadow-sm sm:size-20 ${
                shop.banner_url ? "-mt-10 sm:-mt-12 ring-2 ring-line" : "border-line"
              }`}
            >
              {shop.logo_url ? (
                <Image
                  src={shop.logo_url}
                  alt={shop.name}
                  fill
                  sizes="80px"
                  priority
                  className="object-cover"
                />
              ) : (
                <div
                  className="grid h-full w-full place-items-center text-white font-black text-2xl"
                  style={{ backgroundColor: shop.primary_color }}
                >
                  {shop.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <h1 className="truncate text-xl font-extrabold text-ink sm:text-2xl">{shop.name}</h1>
                  {shop.is_certified && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-black uppercase text-blue-700 shrink-0"
                      title="Boutique vérifiée"
                    >
                      <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
                      <span>Boutique vérifiée</span>
                    </span>
                  )}
                </div>
                <ShopHoursBadge openingHours={shop.opening_hours} />
                <span className="inline-flex items-center gap-1 rounded-full bg-sand/80 px-2.5 py-0.5 text-[11px] font-semibold text-ink" title="Nombre d'abonnés">
                  <Users className="size-3 text-brand-600" aria-hidden />
                  <span>{shop.followers_count ?? 0} abonné{(shop.followers_count ?? 0) > 1 ? "s" : ""}</span>
                </span>
              </div>

              {shop.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted leading-relaxed sm:text-sm">
                  {shop.description}
                </p>
              )}

              {shop.address && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                  <MapPin className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{shop.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Badges livraison/retrait superposés, Bouton s'abonner et Bouton WhatsApp */}
          <div className="flex items-center gap-2 sm:gap-2.5 pt-2 sm:pt-0 shrink-0">
            {/* Piles livraison et retrait superposées */}
            {(shop.delivery_enabled || shop.pickup_enabled) && (
              <div className="flex flex-col gap-1 shrink-0 justify-center">
                {shop.delivery_enabled && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-sand/80 px-2 py-0.5 text-[10px] font-semibold text-muted border border-line/40 leading-none"
                    title="Livraison disponible"
                  >
                    <Truck className="size-3 text-brand-600 shrink-0" aria-hidden />
                    <span>Livraison</span>
                  </span>
                )}
                {shop.pickup_enabled && (
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-sand/80 px-2 py-0.5 text-[10px] font-semibold text-muted border border-line/40 leading-none"
                    title="Retrait en magasin disponible"
                  >
                    <StoreIcon className="size-3 text-brand-600 shrink-0" aria-hidden />
                    <span>Retrait</span>
                  </span>
                )}
              </div>
            )}

            {/* Bouton Suivre (icône individu avec un plus) */}
            <FollowShopButton
              shopId={shop.id}
              shopName={shop.name}
              initialFollowing={initialFollowing}
              initialFollowersCount={shop.followers_count ?? 0}
              variant="icon"
            />

            {/* Bouton WhatsApp (uniquement icône WhatsApp, pas de texte) */}
            <a
              href={whatsappChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="grid size-9 sm:size-10 place-items-center rounded-xl sm:rounded-2xl bg-[#25D366] text-white shadow-xs hover:bg-[#20ba59] active:scale-95 transition-all shrink-0"
              title="Discuter sur WhatsApp"
              aria-label="Discuter sur WhatsApp"
            >
              <WhatsAppIcon className="size-5" />
            </a>

            {/* Bouton retour Explorer : Uniquement visible sur format grand écran PC (hidden md:inline-flex) */}
            <Link
              href="/explorer"
              className="hidden md:inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-muted hover:text-ink hover:bg-sand transition-colors shadow-2xs"
              title="Retourner au catalogue Explorer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Explorer</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
