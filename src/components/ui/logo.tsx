import { APP_NAME } from "@/lib/constants";

/** Icône symbole de Bon Waz à Dealer : Le « Deal » (Poignée de main géométrique). */
export function LogoIcon({ className = "size-7 sm:size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="256" height="256" rx="64" fill="#0F766E" />
      {/* Poignée de main géométrique moderne (symbole du Deal / conclusion de vente) */}
      <path
        d="M56 128L96 88C104 80 116 80 124 88L140 104L116 128L80 128L56 128Z"
        fill="#FFFFFF"
        fillOpacity="0.95"
      />
      <path
        d="M200 128L160 88C152 80 140 80 132 88L116 104L140 128L176 128L200 128Z"
        fill="#FDE68A"
      />
      <path
        d="M88 128L120 160C128 168 140 168 148 160L168 140L144 116L128 132L112 116L88 128Z"
        fill="#FFFFFF"
      />
      {/* Point d'accentuation terracotta (énergie du deal) */}
      <circle cx="128" cy="190" r="12" fill="#E2683C" />
    </svg>
  );
}

/** Logo texte de l'application (symbole + nom). */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight shrink-0 ${className}`}>
      <LogoIcon className="size-7 sm:size-8 drop-shadow-xs" />
      <span className="text-sm sm:text-base md:text-lg">
        Bon Waz <span className="text-accent-500">à Dealer</span>
      </span>
      <span className="sr-only">{APP_NAME}</span>
    </span>
  );
}
