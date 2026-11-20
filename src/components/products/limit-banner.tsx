import { Crown } from "lucide-react";

export function LimitBanner({ currentCount, maxLimit }: { currentCount: number; maxLimit: number }) {
  if (currentCount < maxLimit) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-accent-500/30 bg-accent-100/40 p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500 text-white">
          <Crown className="size-5" aria-hidden />
        </div>
        <div>
          <p className="font-bold text-sm text-ink">
            Limite atteinte ({currentCount} / {maxLimit} produits)
          </p>
          <p className="text-xs text-muted">
            Vous utilisez 100% de la capacité du plan gratuit.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => alert("Les forfaits supérieurs seront bientôt disponibles !")}
        className="rounded-xl bg-accent-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent-600 transition-colors shrink-0"
      >
        Passer au plan supérieur
      </button>
    </div>
  );
}
