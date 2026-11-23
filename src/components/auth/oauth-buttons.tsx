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

export function FacebookIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
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
  const [loadingProvider, setLoadingProvider] = useState<"google" | "facebook" | null>(null);

  const handleOAuth = (provider: "google" | "facebook") => {
    if (loadingProvider) return;
    setLoadingProvider(provider);
    window.location.href = `/api/auth/${provider}?next=${encodeURIComponent(next)}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {erreur === "oauth_google" && (
        <Alert tone="error">
          La connexion avec Google n&apos;est pas encore activée dans votre console Supabase (Authentication &gt; Providers) ou a échoué. Utilisez votre e-mail en attendant.
        </Alert>
      )}

      {erreur === "oauth_facebook" && (
        <Alert tone="error">
          La connexion avec Facebook n&apos;est pas encore activée dans votre console Supabase (Authentication &gt; Providers) ou a échoué. Utilisez votre e-mail en attendant.
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Bouton Google 1-Clic */}
        <button
          type="button"
          onClick={() => handleOAuth("google")}
          disabled={loadingProvider !== null}
          aria-label={`${labelPrefix} Google`}
          className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-xs transition-all hover:bg-sand/40 hover:border-brand-600/40 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {loadingProvider === "google" ? (
            <div className="size-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : (
            <GoogleIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">
            {loadingProvider === "google" ? "Redirection…" : `${labelPrefix} Google`}
          </span>
        </button>

        {/* Bouton Facebook 1-Clic */}
        <button
          type="button"
          onClick={() => handleOAuth("facebook")}
          disabled={loadingProvider !== null}
          aria-label={`${labelPrefix} Facebook`}
          className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-xs transition-all hover:bg-sand/40 hover:border-brand-600/40 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {loadingProvider === "facebook" ? (
            <div className="size-4 animate-spin rounded-full border-2 border-[#1877F2] border-t-transparent" />
          ) : (
            <FacebookIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">
            {loadingProvider === "facebook" ? "Redirection…" : `${labelPrefix} Facebook`}
          </span>
        </button>
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

function OAuthButtonsFallback({
  next = "/boutiques",
  labelPrefix = "Continuer avec",
  showDivider = true,
  dividerText = "ou avec e-mail",
}: OAuthButtonsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-xs">
          <GoogleIcon className="size-4 shrink-0" />
          <span className="truncate">{labelPrefix} Google</span>
        </div>
        <div className="flex h-11 items-center justify-center gap-2.5 rounded-2xl border border-line bg-white px-3 text-xs font-bold text-ink shadow-xs">
          <FacebookIcon className="size-4 shrink-0" />
          <span className="truncate">{labelPrefix} Facebook</span>
        </div>
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
