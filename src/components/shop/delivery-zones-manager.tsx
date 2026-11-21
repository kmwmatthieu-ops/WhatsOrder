"use client";

import { useState, useTransition, type SyntheticEvent } from "react";
import { Plus, Trash2, Edit2, Check, X, MapPin } from "lucide-react";
import { formatFCFA } from "@/lib/format";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { createDeliveryZone, updateDeliveryZone, deleteDeliveryZone } from "@/app/tableau-de-bord/parametres/actions";
import type { DeliveryZone } from "@/types/database";

type Props = {
  initialZones: DeliveryZone[];
};

export function DeliveryZonesManager({ initialZones }: Props) {
  const [zones, setZones] = useState<DeliveryZone[]>(initialZones);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // État formulaire d'ajout
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState<number | "">("");

  // État édition
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editFee, setEditFee] = useState<number | "">("");

  function handleCreate(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newName.trim()) return;
    const feeNum = typeof newFee === "number" ? newFee : 0;
    if (feeNum < 0) return;

    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", newName.trim());
      fd.append("fee", String(feeNum));

      const res = await createDeliveryZone(fd);
      if (res.error) {
        setError(res.error);
      } else if (res.zone) {
        setZones((prev) => [...prev, res.zone!].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName("");
        setNewFee("");
      }
    });
  }

  function handleStartEdit(zone: DeliveryZone) {
    setEditingId(zone.id);
    setEditName(zone.name);
    setEditFee(zone.fee);
    setError("");
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) return;
    const feeNum = typeof editFee === "number" ? editFee : 0;
    if (feeNum < 0) return;

    setError("");
    startTransition(async () => {
      const fd = new FormData();
      fd.append("name", editName.trim());
      fd.append("fee", String(feeNum));

      const res = await updateDeliveryZone(id, fd);
      if (res.error) {
        setError(res.error);
      } else {
        setZones((prev) =>
          prev.map((z) => (z.id === id ? { ...z, name: editName.trim(), fee: feeNum } : z))
        );
        setEditingId(null);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Voulez-vous vraiment supprimer cette zone de livraison ?")) return;

    setError("");
    startTransition(async () => {
      const res = await deleteDeliveryZone(id);
      if (res.error) {
        setError(res.error);
      } else {
        setZones((prev) => prev.filter((z) => z.id !== id));
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs font-bold text-muted">
        <MapPin className="size-4 text-brand-600" aria-hidden />
        <span>Tarification personnalisée par quartier ou ville</span>
      </div>

      {error && <p className="text-xs text-danger-600 font-semibold">{error}</p>}

      {/* Liste des zones */}
      {zones.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-4 text-center bg-sand/30">
          <p className="text-xs text-muted">
            Aucune zone personnalisée. Le tarif forfaitaire général est actuellement appliqué pour toutes les livraisons.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-line rounded-2xl border border-line bg-white overflow-hidden shadow-xs">
          {zones.map((zone) => {
            const isEditing = editingId === zone.id;

            if (isEditing) {
              return (
                <div key={zone.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 bg-brand-50/40">
                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nom de la zone"
                      className="h-9 flex-1 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editFee}
                        onChange={(e) => setEditFee(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="Frais"
                        className="h-9 w-24 rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                      />
                      <span className="text-xs text-muted">FCFA</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(zone.id)}
                      disabled={isPending}
                      className="grid size-8 place-items-center rounded-xl bg-success-600 text-white hover:bg-success-700 disabled:opacity-50"
                      title="Enregistrer"
                    >
                      <Check className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={isPending}
                      className="grid size-8 place-items-center rounded-xl bg-sand text-ink hover:bg-line disabled:opacity-50"
                      title="Annuler"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={zone.id} className="flex items-center justify-between p-3.5 hover:bg-sand/30 transition-colors">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-sm font-bold text-ink truncate">{zone.name}</p>
                  <p className="text-xs font-extrabold text-brand-700 mt-0.5">{formatFCFA(zone.fee)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(zone)}
                    disabled={isPending}
                    className="grid size-8 place-items-center rounded-xl text-muted hover:bg-sand hover:text-ink disabled:opacity-50"
                    title="Modifier la zone"
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(zone.id)}
                    disabled={isPending}
                    className="grid size-8 place-items-center rounded-xl text-danger-500 hover:bg-danger-50 hover:text-danger-700 disabled:opacity-50"
                    title="Supprimer la zone"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formulaire d'ajout rapide */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row items-center gap-2 pt-1">
        <input
          type="text"
          placeholder="Ex: Cocody, Plateau, Yopougon..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={60}
          className="h-10 w-full sm:flex-1 rounded-2xl border border-line bg-white px-3.5 text-xs font-bold text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
        />
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="flex flex-1 sm:w-32 items-center rounded-2xl border border-line bg-white px-3 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100">
            <input
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value === "" ? "" : Number(e.target.value))}
              className="h-10 w-full bg-transparent text-xs font-bold text-ink outline-none"
            />
            <span className="text-[11px] font-bold text-muted ml-1">FCFA</span>
          </div>
          <Button type="submit" size="sm" disabled={isPending || !newName.trim()} className="h-10 shrink-0">
            {isPending ? <Spinner className="size-4" /> : <Plus className="size-4" />}
            <span className="hidden sm:inline">Ajouter</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
