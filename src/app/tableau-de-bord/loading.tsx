export default function DashboardLoading() {
  return (
    <div className="p-4 sm:p-8 space-y-6 animate-pulse max-w-5xl mx-auto">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-xl bg-sand" />
        <div className="h-4 w-64 rounded-lg bg-sand" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-line bg-white p-4 space-y-2">
            <div className="h-3 w-20 rounded bg-sand" />
            <div className="h-6 w-28 rounded-lg bg-sand" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
        <div className="h-5 w-40 rounded-lg bg-sand" />
        <div className="space-y-3">
          <div className="h-12 rounded-xl bg-sand/60 w-full" />
          <div className="h-12 rounded-xl bg-sand/60 w-full" />
          <div className="h-12 rounded-xl bg-sand/60 w-full" />
        </div>
      </div>
    </div>
  );
}
