"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { COUNTRIES, DEFAULT_COUNTRY_CODE } from "@/lib/phone";

type Props = {
  countryCode: string;
  local: string;
  onChange: (next: { countryCode: string; local: string }) => void;
  error?: string;
  label?: string;
  hint?: string;
};

/**
 * Saisie d'un numéro WhatsApp optimisée :
 * - Sélecteur ultra-compact affichant UNIQUEMENT le drapeau officiel et l'indicatif (ex: 🇬🇦 +241)
 * - Aucune abréviation textuelle (pas de GA, CI, SN), aucun nom de pays dans le bouton
 * - Vrais drapeaux nets (image FlagCDN haute résolution) même sous Windows
 * - Largeur réduite pour maximiser l'espace du numéro
 */
export function PhoneInput({
  countryCode,
  local,
  onChange,
  error,
  label = "Numéro WhatsApp",
  hint,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor="whatsapp-local" className="text-sm font-semibold text-ink">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2 w-full">
        {/* Sélecteur compact : drapeau + indicatif uniquement */}
        <div ref={containerRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-label={`Indicatif actuel : +${selected.code}`}
            aria-expanded={open}
            className="flex h-12 w-[92px] sm:w-[98px] items-center justify-between rounded-2xl border border-line bg-white px-2.5 outline-none transition-colors hover:border-brand-600 focus:border-brand-600 focus:ring-4 focus:ring-brand-100 cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <img
                src={`https://flagcdn.com/w40/${selected.iso}.png`}
                srcSet={`https://flagcdn.com/w80/${selected.iso}.png 2x`}
                alt=""
                width={20}
                height={15}
                className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-2xs"
              />
              <span className="text-xs sm:text-sm font-bold text-ink">
                +{selected.code}
              </span>
            </div>
            <ChevronDown
              className={`size-3.5 shrink-0 text-muted transition-transform duration-150 ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden
            />
          </button>

          {/* Menu déroulant avec vrais drapeaux */}
          {open && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-50 w-56 max-h-60 overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100">
              {COUNTRIES.map((c) => {
                const isCurrent = c.code === selected.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      onChange({ countryCode: c.code, local });
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs sm:text-sm transition-colors ${
                      isCurrent
                        ? "bg-brand-50 text-brand-900 font-bold"
                        : "text-ink hover:bg-sand/60 font-medium"
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${c.iso}.png`}
                      srcSet={`https://flagcdn.com/w80/${c.iso}.png 2x`}
                      alt=""
                      width={20}
                      height={15}
                      className="h-3.5 w-5 shrink-0 rounded-[2px] object-cover shadow-2xs"
                    />
                    <span className="font-bold text-ink shrink-0">+{c.code}</span>
                    <span className="truncate text-xs text-muted">({c.name})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Champ de saisie du numéro */}
        <input
          id="whatsapp-local"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="07 01 02 03 04"
          value={local}
          onChange={(e) => onChange({ countryCode, local: e.target.value })}
          aria-invalid={!!error || undefined}
          className={`h-12 min-w-0 flex-1 rounded-2xl border bg-white px-3.5 sm:px-4 text-[15px] sm:text-[16px] text-ink placeholder:text-muted/60 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${
            error ? "border-danger-600 ring-2 ring-danger-100" : "border-line"
          }`}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs sm:text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}
