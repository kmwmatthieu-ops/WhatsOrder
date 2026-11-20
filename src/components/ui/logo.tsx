import { APP_NAME } from "@/lib/constants";

/** Icône symbole de Bon Waz à Dealer (sac de commerce + éclair de deal). */
export function LogoIcon({ className = "size-7 sm:size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      <rect width="32" height="32" rx="10" fill="#0F766E" />
      {/* Anse du sac */}
      <path
        d="M11 11.5V9.5C11 8.1 12.1 7 13.5 7H18.5C19.9 7 21 8.1 21 9.5V11.5"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Sac de vente / boutique */}
      <path
        d="M7.5 11.5H24.5L23.2 24.2C23.08 25.28 22.18 26 21.1 26H10.9C9.82 26 8.92 25.28 8.8 24.2L7.5 11.5Z"
        fill="#115E59"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Éclair / Deal doré au centre */}
      <path
        d="M17.2 14L13.8 19H17.8L15 23.5"
        stroke="#FCD34D"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
