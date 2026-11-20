"use client";

import { useState, useTransition } from "react";
import { FolderPlus, Pencil, Trash2, X } from "lucide-react";
import { createCategory, updateCategory, deleteCategory } from "@/app/tableau-de-bord/produits/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/alert";
import type { Category } from "@/types/database";

export function CategoryManager({
  categories,
  open,
  onClose,
}: {
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await createCategory(newName.trim());
      if (res.error) setError(res.error);
      else setNewName("");
    });
  }

  function handleUpdate(id: string) {
    if (!editingName.trim()) return;
    setError("");
    startTransition(async () => {
      const res = await updateCategory(id, editingName.trim());
      if (res.error) setError(res.error);
      else setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Supprimer la catégorie "${name}" ? Les produits associés ne seront pas supprimés.`)) {
      return;
    }
    setError("");
    startTransition(async () => {
      const res = await deleteCategory(id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl border border-line bg-white p-6 shadow-xl flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Gérer les catégories</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-muted hover:bg-sand"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && <Alert tone="error">{error}</Alert>}

        {/* Formulaire ajout catégorie */}
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            label="Nouvelle catégorie"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Ex. Robes, Chaussures…"
            className="h-11"
          />
          <div className="pt-6">
            <Button type="submit" size="sm" loading={isPending} disabled={!newName.trim()}>
              <FolderPlus className="size-4" />
              Ajouter
            </Button>
          </div>
        </form>

        {/* Liste des catégories existantes */}
        <div className="flex flex-col gap-2 pt-2 border-t border-line">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">
            Catégories existantes ({categories.length})
          </span>

          {categories.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">Aucune catégorie pour le moment.</p>
          ) : (
            <div className="flex flex-col divide-y divide-line">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between py-2.5 gap-2">
                  {editingId === cat.id ? (
                    <div className="flex flex-1 items-center gap-2">
                      <input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="h-9 flex-1 rounded-xl border border-brand-600 px-3 text-sm outline-none"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleUpdate(cat.id)} loading={isPending}>
                        OK
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-semibold text-ink truncate">{cat.name}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(cat.id);
                            setEditingName(cat.name);
                          }}
                          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-sand"
                          aria-label={`Renommer ${cat.name}`}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat.id, cat.name)}
                          className="grid size-8 place-items-center rounded-lg text-danger-600 hover:bg-danger-50"
                          aria-label={`Supprimer ${cat.name}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button variant="secondary" block onClick={onClose}>
          Terminer
        </Button>
      </div>
    </div>
  );
}
