import Link from "next/link";
import { Crown } from "lucide-react";

export function LimitBanner({ currentCount, maxLimit }: { currentCount: number; maxLimit: number | null }) {
  if (maxLimit === null || currentCount < maxLimit) return null;

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-accent-500/30 bg-accent-100/40 p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-500 text-white">
          <Crown className="size-5" aria-hidden />
        </div>
        <div>
          <p className="font-bold text-sm text-ink">
            Limite de catalogue atteinte ({currentCount} / {maxLimit} produits)
          </p>
          <p className="text-xs text-muted">
            Vous avez atteint la capacité maximale autorisée par votre formule actuelle.
          </p>
        </div>
      </div>
      <Link
        href="/tableau-de-bord/abonnement"
        className="rounded-xl bg-accent-500 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-accent-600 transition-colors shrink-0 whitespace-nowrap"
      >
        Passer au plan supérieur
      </Link>
    </div>
  );
}
