import { APP_NAME } from "@/lib/constants";

/** Logo texte de l'application (pastille + nom). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 font-extrabold tracking-tight shrink-0 ${className}`}>
      <span
        aria-hidden
        className="grid size-7 sm:size-8 place-items-center rounded-xl bg-brand-600 text-xs sm:text-sm text-white shadow-xs shrink-0"
      >
        W
      </span>
      <span className="text-base sm:text-lg">
        Whats<span className="text-accent-500">Order</span>
      </span>
      <span className="sr-only">{APP_NAME}</span>
    </span>
  );
}
