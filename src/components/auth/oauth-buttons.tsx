"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui/alert";

interface OAuthButtonsProps {
  next?: string;
  labelPrefix?: "Continuer avec" | "Se connecter avec" | "S'inscrire avec";
  showDivider?: boolean;
  dividerText?: string;
}

export function GoogleIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.42 7.34 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.58 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
      />
    </svg>
  );
}

function OAuthButtonsContent({
  next = "/boutiques",
  labelPrefix = "Continuer avec",
  showDivider = true,
  dividerText = "ou avec e-mail",
}: OAuthButtonsProps) {
  const searchParams = useSearchParams();
  const erreur = searchParams ? searchParams.get("erreur") : null;
  const [loading, setLoading] = useState(false);

  const handleOAuth = () => {
    if (loading) return;
    setLoading(true);
    window.location.href = `/api/auth/google?next=${encodeURIComponent(next)}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {erreur === "oauth_google" && (
        <Alert tone="error">
          La connexion avec Google a rencontré un imprévu. Veuillez réessayer ou utiliser votre e-mail.
        </Alert>
      )}

      {/* Bouton Google 1-Clic pleine largeur */}
      <button
        type="button"
        onClick={handleOAuth}
        disabled={loading}
        aria-label={`${labelPrefix} Google`}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white px-4 text-xs sm:text-sm font-bold text-ink shadow-xs transition-all hover:bg-sand/40 hover:border-brand-600/40 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        ) : (
          <GoogleIcon className="size-4 shrink-0" />
        )}
        <span className="truncate">
          {loading ? "Connexion à Google en cours…" : `${labelPrefix} Google`}
        </span>
      </button>

      {showDivider && (
        <div className="relative my-1 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line/80" />
          </div>
          <div className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {dividerText}
          </div>
        </div>
      )}
    </div>
  );
}

function OAuthButtonsFallback({
  labelPrefix = "Continuer avec",
  showDivider = true,
  dividerText = "ou avec e-mail",
}: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-11 w-full items-center justify-center gap-3 rounded-2xl border border-line bg-white px-4 text-xs sm:text-sm font-bold text-ink shadow-xs">
        <GoogleIcon className="size-4 shrink-0" />
        <span className="truncate">{labelPrefix} Google</span>
      </div>
      {showDivider && (
        <div className="relative my-1 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-line/80" />
          </div>
          <div className="relative bg-white px-3 text-[11px] font-semibold uppercase tracking-wider text-muted">
            {dividerText}
          </div>
        </div>
      )}
    </div>
  );
}

export function OAuthButtons(props: OAuthButtonsProps) {
  return (
    <Suspense fallback={<OAuthButtonsFallback {...props} />}>
      <OAuthButtonsContent {...props} />
    </Suspense>
  );
}
