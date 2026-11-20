"use client";

import { useState } from "react";
import { Clock, ChevronDown, X } from "lucide-react";
import { isShopCurrentlyOpen, DAYS_OF_WEEK, DAY_LABELS_FR } from "@/lib/opening-hours";
import type { OpeningHours } from "@/types/database";

type Props = {
  openingHours?: OpeningHours | null;
};

export function ShopHoursBadge({ openingHours }: Props) {
  const [showModal, setShowModal] = useState(false);
  const status = isShopCurrentlyOpen(openingHours);

  const hours = openingHours || null;

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all hover:scale-105 ${
          status.isOpen
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}
        title="Voir les horaires d'ouverture"
      >
        <span
          className={`size-2 rounded-full ${
            status.isOpen ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
          }`}
          aria-hidden
        />
        <span>{status.isOpen ? "Ouvert" : "Fermé"}</span>
        <ChevronDown className="size-3 opacity-60" />
      </button>

      {/* Modal / Popover des horaires complets */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-white p-5 shadow-xl flex flex-col gap-4 animate-in zoom-in-95"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-brand-600" />
                <h3 className="text-base font-extrabold text-ink">Horaires d&apos;ouverture</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="grid size-8 place-items-center rounded-xl text-muted hover:bg-sand hover:text-ink"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="divide-y divide-line text-xs">
              {DAYS_OF_WEEK.map((day) => {
                const schedule = hours?.[day] || { open: day !== "sunday", start: "08:00", end: "19:00" };
                const isToday = DAY_LABELS_FR[day] === status.dayLabel;

                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between py-2 px-1 rounded-lg ${
                      isToday ? "bg-brand-50/70 font-bold text-brand-900" : "text-ink"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      {isToday && <span className="size-1.5 rounded-full bg-brand-600" />}
                      <span>{DAY_LABELS_FR[day]}</span>
                    </span>
                    {schedule.open ? (
                      <span className="font-semibold text-muted">
                        {schedule.start} - {schedule.end}
                      </span>
                    ) : (
                      <span className="text-muted/70 italic">Fermé</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-1 w-full rounded-2xl bg-ink py-2.5 text-xs font-bold text-white shadow-xs hover:bg-ink/90"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
