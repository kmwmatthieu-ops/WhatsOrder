"use client";

import { useState } from "react";
import { Search, Users } from "lucide-react";
import { CustomerRow, type CustomerRowData } from "@/components/customers/customer-row";

export function CustomersView({ customers }: { customers: CustomerRowData[] }) {
  const [search, setSearch] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Clients</h1>
        <p className="text-xs text-muted mt-0.5">
          Vos clients enregistrés automatiquement lors de leurs commandes.
        </p>
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
