"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SLUG_PROBLEM_MESSAGES, sanitizeSlugInput, slugProblem } from "@/lib/slug";
import { siteUrl } from "@/lib/constants";
import { controlClass } from "@/components/ui/field";

export type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

type Props = {
  value: string;
  onChange: (slug: string) => void;
  onStatusChange: (status: SlugStatus) => void;
  error?: string;
};

/**
 * Champ "lien de la boutique" avec vérification de disponibilité en direct
 * (validation locale immédiate, puis appel RPC après 400 ms sans frappe).
 */
export function SlugField({ value, onChange, onStatusChange, error }: Props) {
  const [status, setStatus] = useState<SlugStatus>("idle");
  const [message, setMessage] = useState<string>("");
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
      const { data, error: rpcError } = await createClient().rpc("is_slug_available", { p_slug: value });
      if (id !== requestId.current) return; // une saisie plus récente a pris le relais
      if (rpcError) update("error", "Vérification impossible. Vérifiez votre connexion.");
      else if (data) update("available", "Ce lien est disponible.");
      else update("taken", "Ce lien est déjà pris. Essayez une variante.");
    }, 400);
    return () => clearTimeout(timer);
    // onStatusChange volontairement exclu : fourni par le parent, stable fonctionnellement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const host = siteUrl().replace(/^https?:\/\//, "");
  const shownError = error ?? (status === "invalid" || status === "taken" || status === "error" ? message : "");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="slug" className="text-sm font-semibold">
        Lien de votre boutique
      </label>
      <div
        className={`${controlClass} flex h-12 items-center gap-0 px-0 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100 ${
          shownError ? "border-danger-600" : "border-line"
        }`}
      >
        <span className="shrink-0 truncate pl-4 text-[15px] text-muted max-w-[45%]">{host}/</span>
        <input
          id="slug"
          value={value}
          onChange={(e) => onChange(sanitizeSlugInput(e.target.value))}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="url"
          maxLength={40}
          aria-invalid={!!shownError || undefined}
          aria-describedby="slug-status"
          className="h-full min-w-0 flex-1 bg-transparent pr-2 outline-none"
        />
        <span className="grid w-10 shrink-0 place-items-center" aria-hidden>
          {status === "checking" && <Loader2 className="size-5 animate-spin text-muted" />}
          {status === "available" && <Check className="size-5 text-success-600" />}
          {(status === "taken" || status === "invalid") && <X className="size-5 text-danger-600" />}
        </span>
      </div>
      <p
        id="slug-status"
        aria-live="polite"
        className={`text-sm ${shownError ? "text-danger-600" : status === "available" ? "text-success-600" : "text-muted"}`}
      >
        {shownError || (status === "available" ? message : status === "checking" ? "Vérification…" : "Lettres minuscules, chiffres et tirets.")}
      </p>
    </div>
  );
}
