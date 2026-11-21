/**
 * Les 5 statuts simples et universels visibles dans les filtres du tableau de bord :
 * - En attente (à la réception)
 * - Confirmée
 * - En livraison
 * - Livrée
 * - Annulée
 */
export const SIMPLE_ORDER_STATUS_LABELS: Record<string, string> = {
  new: "En attente",
  confirmed: "Confirmée",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

/**
 * Dictionnaire complet incluant la rétrocompatibilité pour d'éventuelles anciennes commandes.
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
  ...SIMPLE_ORDER_STATUS_LABELS,
  preparing: "Confirmée",
  ready: "En livraison",
};

const ORDER_STATUS_STYLES: Record<string, string> = {
  new: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-brand-50 text-brand-700 border-brand-200",
  preparing: "bg-brand-50 text-brand-700 border-brand-200",
  ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivering: "bg-indigo-50 text-indigo-700 border-indigo-200",
  delivered: "bg-success-50 text-success-700 border-success-200",
  cancelled: "bg-danger-50 text-danger-700 border-danger-200",
};

export function OrderStatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] ?? status;
  const style = ORDER_STATUS_STYLES[status] ?? "bg-sand text-ink border-line";

  return (
    <span className={`inline-flex items-center rounded-xl border px-2.5 py-0.5 text-xs font-bold ${style}`}>
      {label}
    </span>
  );
}
