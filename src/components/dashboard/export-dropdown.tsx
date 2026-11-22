"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ChevronDown, FileSpreadsheet, FileText, Sparkles } from "lucide-react";

interface ExportDropdownProps {
  count: number;
  shopName: string;
  primaryColor?: string | null;
  onExportExcel: () => void;
  onExportCsv: () => void;
  label?: string;
  className?: string;
}

export function ExportDropdown({
  count,
  shopName,
  primaryColor = "#0F766E",
  onExportExcel,
  onExportCsv,
  label,
  className = "",
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeColor = primaryColor || "#0F766E";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex h-10 items-center justify-center gap-2 self-start sm:self-auto rounded-2xl border border-line bg-white px-3.5 text-xs font-bold text-ink shadow-xs hover:bg-sand transition-all cursor-pointer active:scale-[0.99]"
        title="Exporter les données (Excel stylisé ou CSV)"
      >
        <Download className="size-4 text-brand-600" />
        <span
          className="size-2 rounded-full ring-1 ring-black/10 shrink-0"
          style={{ backgroundColor: activeColor }}
          title={`Couleur du thème : ${activeColor}`}
        />
        <span>{label ?? `Exporter (${count})`}</span>
        <ChevronDown
          className={`size-3.5 text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 sm:right-0 left-0 sm:left-auto mt-2 w-80 sm:w-88 rounded-2xl border border-line bg-white p-2 shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-150">
          <div className="px-3 py-2 border-b border-line/60">
            <div className="flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-brand-600" />
              <p className="text-xs font-black text-ink">Exporter les données</p>
            </div>
            <p className="text-[11px] text-muted mt-0.5">
              Formats adaptés à la boutique <strong className="text-ink">{shopName}</strong>
            </p>
          </div>

          <div className="py-1 flex flex-col gap-1">
            {/* Option 1: Excel Stylisé */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportExcel();
              }}
              className="w-full text-left flex items-start gap-3 rounded-xl p-2.5 hover:bg-brand-50/60 transition-colors group cursor-pointer"
            >
              <div
                className="size-9 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white"
                style={{ backgroundColor: activeColor }}
              >
                <FileSpreadsheet className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-ink group-hover:text-brand-700">
                    Excel Stylisé (.xls)
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 text-[9px] font-black uppercase text-emerald-700">
                    Recommandé
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">
                  Aux couleurs de la boutique, avec en-tête officiel, statistiques clés et statuts colorés.
                </p>
              </div>
            </button>

            {/* Option 2: CSV Structuré */}
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onExportCsv();
              }}
              className="w-full text-left flex items-start gap-3 rounded-xl p-2.5 hover:bg-sand transition-colors group cursor-pointer"
            >
              <div className="size-9 rounded-xl bg-sand flex items-center justify-center shrink-0 border border-line text-ink">
                <FileText className="size-5 text-muted group-hover:text-ink" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-black text-ink group-hover:text-brand-700">
                    Fichier CSV (.csv)
                  </span>
                  <span className="rounded-full bg-sand px-1.5 py-0.2 text-[9px] font-semibold text-muted">
                    Standard
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5 leading-snug">
                  Format universel avec cartouche d&apos;en-tête officiel et encodage UTF-8.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
