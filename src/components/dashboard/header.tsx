import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { shopUrl } from "@/lib/constants";
import type { Shop } from "@/types/database";

export function DashboardHeader({ shop }: { shop: Shop }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur-md md:hidden">
      <span className="truncate font-bold text-ink max-w-[65%]">{shop.name}</span>
      <Link
        href={shopUrl(shop.slug)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs font-semibold text-brand-600"
      >
        <span>Boutique</span>
        <ExternalLink className="size-3.5" aria-hidden />
      </Link>
    </header>
  );
}
