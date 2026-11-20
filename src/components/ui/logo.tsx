import { APP_NAME } from "@/lib/constants";

/** Icône symbole de Bon Waz à Dealer (Monogramme B Conversationnel). */
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
      {/* B moderne formé de 2 bulles de discussion connectées */}
      <path d="M72 64H136C158.1 64 176 81.9 176 104C176 126.1 158.1 144 136 144H72V64Z" fill="#F0FDFA" />
      <path d="M72 128H148C172.3 128 192 147.7 192 172C192 196.3 172.3 216 148 216H72V128Z" fill="#CCFBF1" />
      {/* Accent deal terracotta */}
      <circle cx="140" cy="172" r="14" fill="#E2683C" />
      {/* Queue de bulle conversationnelle discrète */}
      <path d="M72 216L54 226V210L72 216Z" fill="#CCFBF1" />
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
