"use client";

import { TextArea } from "@radix-ui/themes";
import { EditableField } from "@/components/ui/EditableField";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { CategorySelector } from "./selectors";
import { formatDateTime } from "@/lib/formatting";
import type { Recipe, RecipeCategory } from "@/types/recipes";

interface RecipeHeaderProps {
  recipe: Recipe;
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  category: RecipeCategory;
  onCategoryChange: (category: RecipeCategory) => void;
  onBlur: (field: "name" | "description" | "category") => void;
  savingName: boolean;
  savingDescription: boolean;
  savingCategory: boolean;
}

export function RecipeHeader({
  recipe,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  category,
  onCategoryChange,
  onBlur,
  savingName,
  savingDescription,
  savingCategory,
}: RecipeHeaderProps) {
  return (
    <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <EditableField
              label="Recipe name"
              value={name}
              onChange={onNameChange}
              placeholder="e.g. Country loaf"
              onBlur={() => onBlur("name")}
              isSaving={savingName}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Description
            </span>
            <SaveIndicator isSaving={savingDescription} />
          </div>
          <TextArea
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value)}
            onBlur={() => onBlur("description")}
            placeholder="Describe this recipe iteration."
            rows={3}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                Category
              </label>
              <div className="flex items-center gap-2">
                <CategorySelector value={category} onChange={onCategoryChange} />
                <SaveIndicator isSaving={savingCategory} />
              </div>
            </div>
          </div>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            Last updated {formatDateTime(recipe.updatedAt)}
          </span>
        </div>
      </div>
    </section>
  );
}
