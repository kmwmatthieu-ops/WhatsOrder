export default function RootLoading() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-cream/60">
      <div className="flex flex-col items-center gap-3">
        <div className="size-9 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
        <p className="text-xs font-semibold text-muted tracking-tight">Chargement en cours...</p>
      </div>
    </div>
  );
}
