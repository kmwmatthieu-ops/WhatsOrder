export default function ShopLoading() {
  return (
    <div className="min-h-dvh bg-cream animate-pulse">
      {/* Header skeleton */}
      <div className="border-b border-line bg-white px-4 pt-6 pb-5">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <div className="size-16 sm:size-20 rounded-2xl bg-sand shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 rounded-xl bg-sand" />
            <div className="h-4 w-64 rounded-xl bg-sand" />
          </div>
        </div>
      </div>

      {/* Catalog skeleton */}
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        <div className="flex gap-2 overflow-x-hidden">
          <div className="h-9 w-20 rounded-full bg-sand" />
          <div className="h-9 w-24 rounded-full bg-sand" />
          <div className="h-9 w-28 rounded-full bg-sand" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-line bg-white p-3 space-y-3">
              <div className="aspect-square rounded-xl bg-sand w-full" />
              <div className="h-4 w-3/4 rounded-lg bg-sand" />
              <div className="h-4 w-1/2 rounded-lg bg-sand" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
