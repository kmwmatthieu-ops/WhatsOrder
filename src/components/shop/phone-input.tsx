"use client";

import { COUNTRIES } from "@/lib/phone";

type Props = {
  countryCode: string;
  local: string;
  onChange: (next: { countryCode: string; local: string }) => void;
  error?: string;
  label?: string;
  hint?: string;
};

/** Saisie d'un numéro WhatsApp : indicatif pays + numéro local. */
export function PhoneInput({ countryCode, local, onChange, error, label = "Numéro WhatsApp", hint }: Props) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label htmlFor="whatsapp-local" className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2 w-full">
        <select
          aria-label="Indicatif et pays"
          value={countryCode}
          onChange={(e) => onChange({ countryCode: e.target.value, local })}
          className="h-12 w-[150px] sm:w-48 shrink-0 rounded-2xl border border-line bg-white px-2.5 sm:px-3 text-xs sm:text-sm font-medium text-ink outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100 cursor-pointer truncate"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name} (+{c.code})
            </option>
          ))}
        </select>
        <input
          id="whatsapp-local"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="07 01 02 03 04"
          value={local}
          onChange={(e) => onChange({ countryCode, local: e.target.value })}
          aria-invalid={!!error || undefined}
          className={`h-12 min-w-0 flex-1 rounded-2xl border bg-white px-3 sm:px-4 text-[15px] sm:text-[16px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100 ${
            error ? "border-danger-600 ring-2 ring-danger-100" : "border-line"
          }`}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm font-medium text-danger-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}
