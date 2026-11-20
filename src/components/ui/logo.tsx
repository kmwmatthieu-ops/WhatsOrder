import { APP_NAME } from "@/lib/constants";

/** Logo texte de l'application (pastille + nom). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2 font-extrabold tracking-tight shrink-0 ${className}`}>
      <span
        aria-hidden
        className="grid size-7 sm:size-8 place-items-center rounded-xl bg-brand-600 text-xs sm:text-sm font-black text-white shadow-xs shrink-0"
      >
        W
      </span>
      <span className="text-sm sm:text-base md:text-lg">
        Bon Waz <span className="text-accent-500">à Dealer</span>
      </span>
      <span className="sr-only">{APP_NAME}</span>
    </span>
  );
}
