"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestJson } from "@/lib/api";
import type { YieldPreset } from "@/types/recipes";

const YIELD_PRESETS_KEY = ["yield-presets"];

/**
 * Suggested starter portions, shown as one-tap chips when the user has no
 * presets yet. Tapping one creates a real preset row.
 */
export const SUGGESTED_PRESETS: Array<{ label: string; unitWeight: number }> = [
  { label: "Small bun", unitWeight: 80 },
  { label: "Dinner roll", unitWeight: 60 },
  { label: "Pullman loaf", unitWeight: 450 },
  { label: "Baguette", unitWeight: 350 },
];

export function useYieldPresets() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: YIELD_PRESETS_KEY,
    queryFn: () => requestJson<YieldPreset[]>("/api/yield-presets"),
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: YIELD_PRESETS_KEY });

  const createPreset = useMutation({
    mutationFn: (input: { label: string; unitWeight: number }) =>
      requestJson<YieldPreset>("/api/yield-presets", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const updatePreset = useMutation({
    mutationFn: ({ id, ...input }: { id: string; label?: string; unitWeight?: number }) =>
      requestJson<YieldPreset>(`/api/yield-presets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  });

  const deletePreset = useMutation({
    mutationFn: (id: string) =>
      requestJson<{ id: string }>(`/api/yield-presets/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  return {
    presets: query.data ?? [],
    isLoading: query.isLoading,
    createPreset,
    updatePreset,
    deletePreset,
  };
}
