"use client";

import { Clock } from "lucide-react";
import { DAYS_OF_WEEK, DAY_LABELS_FR, type DayKey } from "@/lib/opening-hours";
import type { OpeningHours } from "@/types/database";

type Props = {
  value: OpeningHours;
  onChange: (value: OpeningHours) => void;
};

export function OpeningHoursEditor({ value, onChange }: Props) {
  function handleToggleDay(day: DayKey) {
    const current = value[day];
    onChange({
      ...value,
      [day]: {
        ...current,
        open: !current.open,
      },
    });
  }

  function handleTimeChange(day: DayKey, field: "start" | "end", time: string) {
    if (!time) return;
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: time,
      },
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <Clock className="size-4 shrink-0 text-brand-600" aria-hidden />
        <span>Définissez vos horaires d&apos;ouverture hebdomadaires</span>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = value[day];
          const isOpen = schedule.open;

          return (
            <div
              key={day}
              className={`flex flex-wrap items-center justify-between px-3 py-2.5 gap-2 transition-colors ${
                isOpen ? "bg-white" : "bg-sand/30"
              }`}
            >
              <div className="flex items-center gap-2 shrink-0">
                <span className={`w-18 text-xs sm:text-sm font-bold ${isOpen ? "text-ink" : "text-muted"}`}>
                  {DAY_LABELS_FR[day]}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold transition-colors ${
                    isOpen
                      ? "bg-success-50 text-success-700 border border-success-200"
                      : "bg-sand text-muted border border-line"
                  }`}
                >
                  {isOpen ? "Ouvert" : "Fermé"}
                </button>
              </div>

              {isOpen ? (
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <span className="text-[11px] text-muted">De</span>
                  <label className="relative inline-flex items-center justify-center rounded-lg border border-line bg-sand/30 px-2 py-1 text-xs font-extrabold tabular-nums text-ink shadow-2xs transition-colors hover:border-brand-600 focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 cursor-pointer">
                    <span>{schedule.start}</span>
                    <input
                      type="time"
                      value={schedule.start}
                      aria-label={`Heure d'ouverture ${DAY_LABELS_FR[day]}`}
                      onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>

                  <span className="text-[11px] text-muted">à</span>

                  <label className="relative inline-flex items-center justify-center rounded-lg border border-line bg-sand/30 px-2 py-1 text-xs font-extrabold tabular-nums text-ink shadow-2xs transition-colors hover:border-brand-600 focus-within:border-brand-600 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-100 cursor-pointer">
                    <span>{schedule.end}</span>
                    <input
                      type="time"
                      value={schedule.end}
                      aria-label={`Heure de fermeture ${DAY_LABELS_FR[day]}`}
                      onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                      onClick={(e) => {
                        try {
                          e.currentTarget.showPicker?.();
                        } catch {
                          /* ignore */
                        }
                      }}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                </div>
              ) : (
                <span className="text-[11px] italic text-muted">Fermé toute la journée</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
