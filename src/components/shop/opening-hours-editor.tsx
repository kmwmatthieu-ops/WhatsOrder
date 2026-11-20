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
        <Clock className="size-4 text-brand-600" aria-hidden />
        <span>Définissez vos horaires d&apos;ouverture hebdomadaires</span>
      </div>

      <div className="divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden">
        {DAYS_OF_WEEK.map((day) => {
          const schedule = value[day];
          const isOpen = schedule.open;

          return (
            <div
              key={day}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2.5 transition-colors ${
                isOpen ? "bg-white" : "bg-sand/30"
              }`}
            >
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:w-36">
                <span className={`text-sm font-bold ${isOpen ? "text-ink" : "text-muted"}`}>
                  {DAY_LABELS_FR[day]}
                </span>
                <button
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                    isOpen
                      ? "bg-success-50 text-success-700 border border-success-200"
                      : "bg-sand text-muted border border-line"
                  }`}
                >
                  {isOpen ? "Ouvert" : "Fermé"}
                </button>
              </div>

              {isOpen ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted">De</span>
                    <input
                      type="time"
                      value={schedule.start}
                      onChange={(e) => handleTimeChange(day, "start", e.target.value)}
                      className="h-8 rounded-xl border border-line bg-white px-2 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                  </div>
                  <span className="text-muted">à</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="time"
                      value={schedule.end}
                      onChange={(e) => handleTimeChange(day, "end", e.target.value)}
                      className="h-8 rounded-xl border border-line bg-white px-2 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                  </div>
                </div>
              ) : (
                <span className="text-xs italic text-muted">Boutique fermée toute la journée</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
