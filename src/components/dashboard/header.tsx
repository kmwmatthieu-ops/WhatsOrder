import Link from "next/link";
import { BadgeCheck, ExternalLink, User } from "lucide-react";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { shopUrl } from "@/lib/constants";
import type { Shop } from "@/types/database";

export function DashboardHeader({
  shop,
  communityWhatsappUrl,
}: {
  shop: Shop;
  communityWhatsappUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-md md:hidden">
      <Link href="/boutiques" className="flex items-center gap-1.5 min-w-0 max-w-[42%] hover:opacity-85 transition-opacity">
        <span className="truncate font-bold text-ink text-sm">{shop.name}</span>
        {shop.is_certified && (
          <span title="Boutique vérifiée" className="shrink-0 inline-flex items-center">
            <BadgeCheck className="size-3.5 fill-blue-600 text-white" />
          </span>
        )}
        <span className="shrink-0 rounded-md bg-sand px-1 py-0.5 text-[9px] font-semibold text-muted">Boutiques</span>
      </Link>
      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={communityWhatsappUrl?.trim() || "https://chat.whatsapp.com/InviteBonWazPlatform"}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors shadow-2xs"
          title="Rejoindre la communauté WhatsApp officielle"
        >
          <WhatsAppIcon className="size-3.5 shrink-0 fill-emerald-600 text-white" />
          <span>WhatsApp</span>
        </a>
        <Link
          href="/compte/parametres"
          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink px-2 py-1 rounded-lg border border-line bg-sand/40"
          title="Basculer vers l'Espace Client"
        >
          <User className="size-3.5 text-brand-600" />
          <span className="hidden xs:inline">Client</span>
        </Link>
        <Link
          href={shopUrl(shop.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs font-semibold text-brand-600"
        >
          <span>Boutique</span>
          <ExternalLink className="size-3.5" aria-hidden />
        </Link>
      </div>
    </header>
  );
}
