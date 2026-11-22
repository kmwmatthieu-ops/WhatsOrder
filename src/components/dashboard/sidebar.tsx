"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingBag, Users, Settings, ExternalLink, LogOut, CreditCard, User, ArrowRight, BadgeCheck } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/app/(auth)/actions";
import { shopUrl } from "@/lib/constants";
import type { Shop } from "@/types/database";

const NAV_ITEMS = [
  { href: "/tableau-de-bord", label: "Accueil", icon: Home, exact: true },
  { href: "/tableau-de-bord/commandes", label: "Commandes", icon: ShoppingBag, exact: false },
  { href: "/tableau-de-bord/produits", label: "Produits", icon: Package, exact: false },
  { href: "/tableau-de-bord/clients", label: "Clients", icon: Users, exact: false },
  { href: "/tableau-de-bord/abonnement", label: "Abonnement", icon: CreditCard, exact: false },
  { href: "/tableau-de-bord/parametres", label: "Paramètres", icon: Settings, exact: false },
];

export function Sidebar({ shop }: { shop: Shop }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:border-line md:bg-white md:p-6 min-h-screen">
      <div className="mb-8">
        <Logo />
      </div>

      <div className="mb-6 rounded-2xl bg-sand/60 p-3.5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Votre boutique</p>
          <Link
            href="/boutiques"
            className="text-[11px] font-bold text-brand-700 hover:text-brand-800 underline"
            title="Afficher la liste de vos boutiques"
          >
            Changer
          </Link>
        </div>
        <div className="mt-1 flex items-center gap-1.5 min-w-0">
          <p className="truncate font-bold text-ink">{shop.name}</p>
          {shop.is_certified && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-1.5 py-0.5 text-[9px] font-black uppercase text-blue-700 shrink-0"
              title="Boutique vérifiée et certifiée"
            >
              <BadgeCheck className="size-3 fill-blue-600 text-white" />
              <span>Certifié</span>
            </span>
          )}
        </div>
        <a
          href={shopUrl(shop.slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline"
        >
          <span>Voir ma boutique</span>
          <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                isActive ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-sand/50 hover:text-ink"
              }`}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bascule vers Espace Client & Explorer */}
      <div className="pt-3 pb-3 border-t border-line">
        <Link
          href="/compte/parametres"
          className="flex items-center justify-between gap-2 rounded-2xl border border-line bg-sand/30 p-3 hover:bg-sand/70 hover:border-brand-600/40 transition-all text-left group"
          title="Accéder à l'espace client & préférences"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-700 shrink-0 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <User className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink truncate">Espace Client</p>
              <p className="text-[10px] text-muted truncate">Explorer & Paramètres</p>
            </div>
          </div>
          <ArrowRight className="size-3.5 text-muted group-hover:text-brand-700 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>

      <form action={signOut} className="pt-2 border-t border-line">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-danger-50 hover:text-danger-600 transition-colors"
        >
          <LogOut className="size-5 shrink-0" aria-hidden />
          <span>Déconnexion</span>
        </button>
      </form>
    </aside>
  );
}
