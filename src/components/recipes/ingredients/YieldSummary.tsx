"use client";

import { useEffect, useState } from "react";
import { Pencil1Icon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { getTotalDoughWeight } from "@/lib/scaling";
import { formatGrams } from "@/lib/formatting";

interface YieldSummaryProps {
  ingredients: Ingredient[];
  portionWeight: number | null | undefined;
  portionLabel: string | null | undefined;
  onSave: (portionWeight: number | null, portionLabel: string | null) => Promise<void>;
}

function pluralize(label: string, count: number): string {
  const base = label.trim() || "portion";
  if (count === 1) return base;
  return /s$/i.test(base) ? base : `${base}s`;
}

export function YieldSummary({
  ingredients,
  portionWeight,
  portionLabel,
  onSave,
}: YieldSummaryProps) {
  const totalWeight = getTotalDoughWeight(ingredients);

  const [isEditing, setIsEditing] = useState(false);
  const [weightInput, setWeightInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync the form with the stored values whenever the editor is opened.
  useEffect(() => {
    if (isEditing) {
      setWeightInput(portionWeight != null ? String(portionWeight) : "");
      setLabelInput(portionLabel ?? "");
    }
  }, [isEditing, portionWeight, portionLabel]);

  // Nothing to describe until the formula has some weighable dough.
  if (totalWeight <= 0) {
    return null;
  }

  const hasPortion = portionWeight != null && portionWeight > 0;
  const count = hasPortion ? Math.round(totalWeight / portionWeight) : 0;
  const label = portionLabel?.trim() || "portion";

  const handleSave = async () => {
    const parsed = Number(weightInput);
    const nextWeight =
      weightInput.trim() !== "" && Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    const nextLabel = labelInput.trim() || null;
    setIsSaving(true);
    try {
      await onSave(nextWeight, nextWeight == null ? null : nextLabel);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = async () => {
    setIsSaving(true);
    try {
      await onSave(null, null);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">
      {!isEditing ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {hasPortion ? (
              <>
                <p className="text-neutral-800">
                  Makes <span className="font-semibold">≈ {count}</span>{" "}
                  {pluralize(label, count)}{" "}
                  <span className="text-neutral-500">
                    ({formatGrams(portionWeight)} each)
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatGrams(totalWeight)} of dough
                </p>
              </>
            ) : (
              <>
                <p className="font-medium text-neutral-800">
                  {formatGrams(totalWeight)} of dough
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Set a portion size to see how many this makes
                </p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-800"
          >
            <Pencil1Icon className="h-3.5 w-3.5" />
            {hasPortion ? "Edit" : "Set portion"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Portion size
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Weight each (g)</label>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={weightInput}
                disabled={isSaving}
                onChange={(e) => setWeightInput(e.target.value)}
                placeholder="e.g. 80"
                className="w-28 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-neutral-500">Unit name</label>
              <input
                type="text"
                value={labelInput}
                disabled={isSaving}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="bun, loaf, roll..."
                className="w-36 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:opacity-50"
              />
            </div>
          </div>
          {Number(weightInput) > 0 && (
            <p className="text-xs text-neutral-500">
              ≈ {Math.round(totalWeight / Number(weightInput))}{" "}
              {pluralize(
                labelInput || "portion",
                Math.round(totalWeight / Number(weightInput)),
              )}{" "}
              from this batch
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isSaving}
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
            >
              Cancel
            </button>
            {hasPortion && (
              <button
                type="button"
                onClick={handleClear}
                disabled={isSaving}
                className="ml-auto text-xs text-neutral-500 underline-offset-2 transition hover:text-red-600 hover:underline disabled:opacity-50"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
