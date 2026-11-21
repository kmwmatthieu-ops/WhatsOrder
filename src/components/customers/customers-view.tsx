"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users, Download, Lock } from "lucide-react";
import { CustomerRow, type CustomerRowData } from "@/components/customers/customer-row";
import { downloadCsv } from "@/lib/csv";

export type ExtendedCustomerRowData = CustomerRowData & {
  address?: string | null;
  notes?: string | null;
};

export function CustomersView({
  customers,
  hasCsvExport = true,
}: {
  customers: ExtendedCustomerRowData[];
  hasCsvExport?: boolean;
}) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  function handleExportCsv() {
    const today = new Date().toISOString().slice(0, 10);
    const headers = [
      "Nom complet",
      "Téléphone WhatsApp",
      "Adresse",
      "Nombre de commandes",
      "Total dépensé (FCFA)",
      "Notes internes",
      "Date d'enregistrement",
    ];

    const rows = filteredCustomers.map((c) => [
      c.name,
      c.phone,
      c.address ?? "",
      c.orders_count,
      c.total_spent,
      c.notes ?? "",
      new Date(c.created_at).toLocaleDateString("fr-FR"),
    ]);

    downloadCsv(`clients-${today}.csv`, headers, rows);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">Clients</h1>
          <p className="text-xs text-muted mt-0.5">
            Vos clients enregistrés automatiquement lors de leurs commandes.
          </p>
        </div>

        {customers.length > 0 &&
          (hasCsvExport ? (
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex h-10 items-center justify-center gap-2 self-start sm:self-auto rounded-2xl border border-line bg-white px-3.5 text-xs font-bold text-ink shadow-xs hover:bg-sand transition-colors cursor-pointer"
            >
              <Download className="size-4 text-brand-600" />
              <span>Exporter en CSV ({filteredCustomers.length})</span>
            </button>
          ) : (
            <Link
              href="/tableau-de-bord/abonnement"
              title="L'export CSV est réservé aux forfaits Business et Premium"
              className="inline-flex h-10 items-center justify-center gap-2 self-start sm:self-auto rounded-2xl border border-line bg-white px-3.5 text-xs font-bold text-muted shadow-xs hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <Lock className="size-4 text-amber-600" />
              <span>Export CSV (Business)</span>
            </Link>
          ))}
      </div>

      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted" aria-hidden />
        <input
          type="search"
          placeholder="Rechercher par nom ou numéro WhatsApp…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-11 w-full rounded-2xl border border-line bg-white pl-10 pr-4 text-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
      </div>

      {/* Liste des clients */}
      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-line bg-white p-12 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-sand text-muted mb-3">
            <Users className="size-6" />
          </div>
          <p className="font-bold text-ink text-sm">Aucun client trouvé</p>
          <p className="text-xs text-muted mt-1 max-w-xs">
            {search
              ? "Aucun client ne correspond à votre recherche."
              : "Vos clients apparaîtront ici dès qu'ils passeront commande sur votre boutique."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredCustomers.map((c) => (
            <CustomerRow key={c.id} customer={c} />
          ))}
        </div>
      )}
    </div>
  );
}
