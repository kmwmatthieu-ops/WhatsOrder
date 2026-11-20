"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X, Globe } from "lucide-react";
import { SLUG_PROBLEM_MESSAGES, sanitizeSlugInput, slugProblem } from "@/lib/slug";
import { siteUrl } from "@/lib/constants";
import { controlClass } from "@/components/ui/field";
import { checkSlugAvailability } from "@/app/onboarding/actions";

export type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid";

type Props = {
  value: string;
  onChange: (slug: string) => void;
  onStatusChange: (status: SlugStatus) => void;
  error?: string;
};

/**
 * Champ "lien de la boutique" optimisé pour mobile et PWA :
 * - Touch target généreux avec préfixe "/" épuré
 * - Aperçu complet du lien public affiché clairement sous le champ
 * - Vérification serveur sans blocage réseau
 */
export function SlugField({ value, onChange, onStatusChange, error }: Props) {
  const [status, setStatus] = useState<SlugStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const update = (s: SlugStatus, m = "") => {
      setStatus(s);
      setMessage(m);
      onStatusChange(s);
    };

    if (!value) return update("idle");
    const problem = slugProblem(value);
    if (problem) return update("invalid", SLUG_PROBLEM_MESSAGES[problem]);

    update("checking");
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlugAvailability(value);
        if (id !== requestId.current) return;
        if (res.problem) {
          update("invalid", res.problem);
        } else if (res.available) {
          update("available", "Ce lien est disponible.");
        } else {
          update("taken", "Ce lien est déjà pris. Essayez une variante.");
        }
      } catch {
        if (id !== requestId.current) return;
        update("idle");
      }
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const host = siteUrl().replace(/^https?:\/\//, "");
  const shownError = error ?? (status === "invalid" || status === "taken" ? message : "");

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor="slug" className="text-sm font-semibold text-ink">
        Lien de votre boutique
      </label>

      {/* Conteneur de saisie réactif tactile sur mobile */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={`${controlClass} flex h-12 items-center gap-1.5 px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100 cursor-text transition-all ${
          shownError ? "border-danger-600 ring-2 ring-danger-100" : "border-line"
        }`}
      >
        <span className="shrink-0 select-none text-base font-bold text-muted/60 pl-1">/</span>
        <input
          ref={inputRef}
          id="slug"
          value={value}
          onChange={(e) => onChange(sanitizeSlugInput(e.target.value))}
          placeholder="nom-de-votre-boutique"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          maxLength={40}
          aria-invalid={!!shownError || undefined}
          aria-describedby="slug-status"
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] sm:text-base font-medium text-ink placeholder:text-muted/50 outline-none"
        />
        <span className="grid size-8 shrink-0 place-items-center" aria-hidden>
          {status === "checking" && <Loader2 className="size-4.5 animate-spin text-muted" />}
          {status === "available" && <Check className="size-4.5 text-success-600" />}
          {(status === "taken" || status === "invalid") && <X className="size-4.5 text-danger-600" />}
        </span>
      </div>

      {/* Aperçu du lien réel & statut */}
      <div className="flex flex-col gap-0.5 text-xs">
        <p className="flex items-center gap-1 truncate text-muted">
          <Globe className="size-3.5 shrink-0 text-brand-600/70" aria-hidden />
          <span className="truncate font-mono">
            {host}/{value || "nom-de-votre-boutique"}
          </span>
        </p>

        {shownError ? (
          <p id="slug-status" role="alert" className="text-danger-600 font-medium">
            {shownError}
          </p>
        ) : status === "available" ? (
          <p id="slug-status" className="text-success-700 font-medium">
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
