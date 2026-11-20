import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { createClient, getUser } from "@/lib/supabase/server";
import { AdminShopsTable, type AdminShopRow } from "./admin-shops-table";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Administration générale" };

export default async function AdminPage() {
  const user = await getUser();
  if (!user) redirect("/connexion");

  const supabase = await createClient();

  // Vérifier le rôle administrateur
  const { data: isAdmin } = await supabase.rpc("is_admin");

  if (!isAdmin) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-danger-50 text-danger-600 mb-4">
          <Shield className="size-7" />
        </div>
        <h1 className="text-xl font-extrabold text-ink">Accès restreint</h1>
        <p className="mt-2 text-sm text-muted">
          Cet espace est strictement réservé aux administrateurs de Bon Waz à Dealer.
        </p>
        <Link
          href="/tableau-de-bord"
          className="mt-6 rounded-2xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs"
        >
          Retour au tableau de bord
        </Link>
      </main>
    );
  }

  // Récupérer la liste complète des boutiques via la fonction RPC sécurisée
  const { data: shops } = await supabase.rpc("admin_list_shops");

  const shopsList: AdminShopRow[] = (shops ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    owner_id: s.owner_id,
    owner_email: s.owner_email,
    status: s.status,
    created_at: s.created_at,
    orders_count: Number(s.orders_count),
  }));

  const activeCount = shopsList.filter((s) => s.status === "active").length;
  const suspendedCount = shopsList.filter((s) => s.status === "suspended").length;

  return (
    <div className="min-h-dvh bg-cream text-ink">
      <header className="border-b border-line bg-white px-4 py-4 sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="rounded-lg bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
              Admin
            </span>
          </div>
          <Link
            href="/tableau-de-bord"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline shrink-0 whitespace-nowrap"
          >
            <ArrowLeft className="size-3.5" />
            <span className="hidden sm:inline">Mon espace commerçant</span>
            <span className="sm:hidden">Espace pro</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-4 sm:p-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-black text-ink">Gestion des boutiques</h1>
          <p className="text-xs text-muted mt-0.5">
            Supervision générale et modération des boutiques créées.
          </p>
        </div>

        {/* Indicateurs admin */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Total boutiques</p>
            <p className="text-2xl font-black text-ink mt-1">{shopsList.length}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-success-700">Actives</p>
            <p className="text-2xl font-black text-success-700 mt-1">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white p-4 shadow-xs text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-danger-700">Suspendues</p>
            <p className="text-2xl font-black text-danger-700 mt-1">{suspendedCount}</p>
          </div>
        </div>

        <AdminShopsTable initialShops={shopsList} />
      </main>
    </div>
  );
}
