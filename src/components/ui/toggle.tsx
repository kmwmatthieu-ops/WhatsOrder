"use client";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Masque le libellé visuellement (reste lu par les lecteurs d'écran). */
  hideLabel?: boolean;
  name?: string;
};

/** Interrupteur accessible (role="switch"), zone tactile ≥ 44 px. */
export function Toggle({ checked, onChange, label, description, disabled, hideLabel, name }: ToggleProps) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center justify-between gap-4 ${disabled ? "opacity-60" : ""}`}
    >
      <span className={hideLabel ? "sr-only" : "flex flex-col"}>
        <span className="text-[15px] font-semibold">{label}</span>
        {description && <span className="text-sm text-muted">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={hideLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-brand-600" : "bg-line"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
      {name && <input type="hidden" name={name} value={checked ? "on" : ""} />}
    </label>
  );
}
