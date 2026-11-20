"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, Users, Settings } from "lucide-react";

const NAV_ITEMS = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { href: "/tableau-de-bord/produits", label: "Produits", icon: Package, exact: false },
  { href: "/tableau-de-bord/clients", label: "Clients", icon: Users, exact: false },
  { href: "/tableau-de-bord/parametres", label: "Paramètres", icon: Settings, exact: false },
];

/** Barre de navigation basse pour mobile (360px+, zone tactile >= 44px). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-line bg-white/95 backdrop-blur-md pb-safe md:hidden"
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition-colors ${
                isActive ? "text-brand-600 font-bold" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className="size-5" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
