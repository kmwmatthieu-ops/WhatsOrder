import Image from "next/image";
import Link from "next/link";
import { MapPin, Truck, Store as StoreIcon, ArrowLeft } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { ShopHoursBadge } from "./shop-hours-badge";
import type { Shop } from "@/types/database";

export function ShopHeader({ shop }: { shop: Shop }) {
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
                <h1 className="truncate text-xl font-extrabold text-ink sm:text-2xl">{shop.name}</h1>
                <ShopHoursBadge openingHours={shop.opening_hours} />
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

          {/* Badges livraison/retrait et Bouton WhatsApp */}
          <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
            <div className="flex items-center gap-2 text-xs text-muted">
              {shop.delivery_enabled && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-sand/80 px-2.5 py-1 font-medium">
                  <Truck className="size-3.5 text-brand-600" aria-hidden />
                  Livraison
                </span>
              )}
              {shop.pickup_enabled && (
                <span className="inline-flex items-center gap-1 rounded-xl bg-sand/80 px-2.5 py-1 font-medium">
                  <StoreIcon className="size-3.5 text-brand-600" aria-hidden />
                  Retrait
                </span>
              )}
            </div>

            {/* Bouton retour Explorer : Uniquement visible sur format grand écran PC (hidden md:inline-flex) */}
            <Link
              href="/explorer"
              className="hidden md:inline-flex h-10 items-center gap-1.5 rounded-xl border border-line bg-white px-3.5 text-xs font-semibold text-muted hover:text-ink hover:bg-sand transition-colors shadow-2xs"
              title="Retourner au catalogue Explorer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Explorer</span>
            </Link>

            <a
              href={whatsappChatUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
            >
              <WhatsAppIcon className="size-4" />
              <span>Discuter</span>
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
