/** Bloc gris animé pour les états de chargement. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-2xl bg-sand ${className}`} />;
}

/** Squelette générique d'une page du tableau de bord. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Chargement…">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}
