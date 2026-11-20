import { AlertCircle, CheckCircle2, Info } from "lucide-react";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, string> = {
  error: "bg-danger-50 text-danger-600 border-danger-600/20",
  success: "bg-success-50 text-success-600 border-success-600/20",
  info: "bg-brand-50 text-brand-700 border-brand-600/20",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm ${TONES[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}
