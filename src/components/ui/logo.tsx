import { APP_NAME } from "@/lib/constants";

/**
 * Icône symbole officielle de Bon Waz à Dealer :
 * Le sac shopping signature avec anse continue et crochet / deal intérieur.
 * Conçu en harmonie avec la charte graphique : Deep Teal (#0F766E), blanc pur et accent terracotta (#E2683C).
 */
export function LogoIcon({ className = "size-7 sm:size-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 256 256"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {/* Conteneur squircle arrondi haute précision */}
      <rect width="256" height="256" rx="56" fill="#0F766E" />
      <g transform="scale(0.82) translate(28, 28)">
        {/* Anse extérieure du sac : arc harmonieux centré */}
        <path
          d="M100 84V64C100 44.1178 116.118 28 136 28C155.882 28 172 44.1178 172 64V84"
          stroke="#FFFFFF"
          strokeWidth="16"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Corps du sac shopping avec découpe continue du deal */}
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M64 82H212C223.046 82 232 90.9543 232 102V194C232 216.091 214.091 234 192 234H80C57.9086 234 40 216.091 40 194V102C40 90.9543 48.9543 82 60 82H64ZM172 82V142C172 153.5 165.5 163.5 155 168.5L99 196C89 200.8 77 196.5 72.2 186.5C67.4 176.5 71.7 164.5 81.7 159.7L133 134.5C140.5 130.8 145 123.1 145 114.7V82H172Z"
          fill="#FFFFFF"
        />

        {/* Bouton d'énergie commerçante terracotta */}
        <circle cx="78" cy="178" r="7" fill="#E2683C" />
      </g>
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
