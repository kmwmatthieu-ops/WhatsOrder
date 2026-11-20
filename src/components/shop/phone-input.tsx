"use client";

import { COUNTRIES } from "@/lib/phone";
import { controlClass } from "@/components/ui/field";

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
    <div className="flex flex-col gap-1.5">
      <label htmlFor="whatsapp-local" className="text-sm font-semibold">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          aria-label="Indicatif du pays"
          value={countryCode}
          onChange={(e) => onChange({ countryCode: e.target.value, local })}
          className={`${controlClass} h-12 w-[7.5rem] shrink-0 border-line px-3`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} +{c.code}
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
          className={`${controlClass} h-12 min-w-0 flex-1 ${error ? "border-danger-600" : "border-line"}`}
        />
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : (
        hint && <p className="text-sm text-muted">{hint}</p>
      )}
    </div>
  );
}
