import Link from "next/link";
import { ExternalLink, User } from "lucide-react";
import { shopUrl } from "@/lib/constants";
import type { Shop } from "@/types/database";

export function DashboardHeader({ shop }: { shop: Shop }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-md md:hidden">
      <Link href="/boutiques" className="flex items-center gap-1.5 min-w-0 max-w-[55%] hover:opacity-85 transition-opacity">
        <span className="truncate font-bold text-ink">{shop.name}</span>
        <span className="shrink-0 rounded-md bg-sand px-1.5 py-0.5 text-[10px] font-semibold text-muted">Boutiques</span>
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/compte/parametres"
          className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink px-2 py-1 rounded-lg border border-line bg-sand/40"
          title="Basculer vers l'Espace Client"
        >
          <User className="size-3.5 text-brand-600" />
          <span>Client</span>
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
