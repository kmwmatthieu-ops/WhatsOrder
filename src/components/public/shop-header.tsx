import Image from "next/image";
import { MessageCircle, MapPin, Truck, Store as StoreIcon } from "lucide-react";
import type { Shop } from "@/types/database";

export function ShopHeader({ shop }: { shop: Shop }) {
  const cleanWhatsapp = shop.whatsapp_number.replace(/\D/g, "");
  const whatsappChatUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `Bonjour ${shop.name}, j'ai une question sur votre boutique !`
  )}`;

  return (
    <header className="relative border-b border-line bg-white px-4 pt-6 pb-5 shadow-xs">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {/* Logo ou icône par défaut */}
          <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-line bg-sand sm:size-20">
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
            <h1 className="truncate text-xl font-extrabold text-ink sm:text-2xl">{shop.name}</h1>
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

          <a
            href={whatsappChatUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-[#25D366] px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#20ba59] transition-colors"
          >
            <MessageCircle className="size-4" aria-hidden />
            <span>Discuter</span>
          </a>
        </div>
      </div>
    </header>
  );
}
