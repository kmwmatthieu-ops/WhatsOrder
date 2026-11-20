import { forwardRef, useId } from "react";

const CONTROL =
  "w-full rounded-2xl border bg-white px-4 text-[16px] text-ink placeholder:text-muted/70 " +
  "outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100 " +
  "disabled:bg-sand disabled:text-muted";

function borderFor(error?: string) {
  return error ? "border-danger-600" : "border-line";
}

type FieldWrapperProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
};

/** Libellé + contrôle + message d'aide ou d'erreur. */
export function FieldWrapper({ label, htmlFor, error, hint, optional, children }: FieldWrapperProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold">
        {label} {optional && <span className="font-normal text-muted">(facultatif)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <div id={`${htmlFor}-hint`} className="text-sm text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, optional, id, className = "", ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} optional={optional}>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        className={`${CONTROL} h-12 ${borderFor(error)} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
});

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

export function Textarea({ label, error, hint, optional, id, className = "", ...props }: TextareaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} optional={optional}>
      <textarea
        id={inputId}
        aria-invalid={!!error || undefined}
        className={`${CONTROL} min-h-24 py-3 ${borderFor(error)} ${className}`}
        {...props}
      />
    </FieldWrapper>
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  error?: string;
  hint?: React.ReactNode;
  optional?: boolean;
};

export function Select({ label, error, hint, optional, id, className = "", children, ...props }: SelectProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldWrapper label={label} htmlFor={inputId} error={error} hint={hint} optional={optional}>
      <select
        id={inputId}
        aria-invalid={!!error || undefined}
        className={`${CONTROL} h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%236b6f6a%22><path d=%22M5.5 7.5 10 12l4.5-4.5%22 stroke=%22%236b6f6a%22 stroke-width=%221.8%22 fill=%22none%22/></svg>')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat pr-10 ${borderFor(error)} ${className}`}
        {...props}
      >
        {children}
      </select>
    </FieldWrapper>
  );
}

export { CONTROL as controlClass };
