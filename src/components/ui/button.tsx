import { forwardRef } from "react";
import { Spinner } from "./spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm",
  accent: "bg-accent-500 text-white hover:bg-accent-600 shadow-sm",
  secondary: "bg-white text-ink border border-line hover:bg-sand",
  ghost: "bg-transparent text-ink hover:bg-sand",
  danger: "bg-white text-danger-600 border border-danger-600/30 hover:bg-danger-50",
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  size?: "md" | "sm";
  block?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", loading, size = "md", block, className = "", children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        size === "md" ? "h-12 px-5 text-[15px]" : "h-10 px-4 text-sm",
        block ? "w-full" : "",
        VARIANTS[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
