"use client";

import { useState, useEffect } from "react";
import { Dialog, Button, TextField, Checkbox, Badge } from "@radix-ui/themes";
import type { Recipe, RecipeCategory, DuplicateRecipeData } from "@/types/recipes";
import { formatCategoryLabel } from "@/types/recipes";
import { CategorySelector } from "./CategorySelector";

interface DuplicateRecipeModalProps {
  isOpen: boolean;
  sourceRecipe: Recipe;
  onConfirm: (data: DuplicateRecipeData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DuplicateRecipeModal({
  isOpen,
  sourceRecipe,
  onConfirm,
  onCancel,
  isLoading = false,
}: DuplicateRecipeModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RecipeCategory>(sourceRecipe.category);
  const [copyTags, setCopyTags] = useState(true);
  const [copyIngredients, setCopyIngredients] = useState(true);
  const [copyNotes, setCopyNotes] = useState(true);
  const [copyRatings, setCopyRatings] = useState(true);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setCategory(sourceRecipe.category);
      setCopyTags(true);
      setCopyIngredients(true);
      setCopyNotes(true);
      setCopyRatings(true);
    }
  }, [isOpen, sourceRecipe.category]);

  // Get active version
  const activeVersion = sourceRecipe.versions.find(
    (v) => v.id === sourceRecipe.activeVersionId,
  );

  const versionNumber = activeVersion
    ? sourceRecipe.versions
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .findIndex((v) => v.id === activeVersion.id) + 1
    : 0;

  const tagCount = sourceRecipe.tags?.length || 0;
  const ingredientCount = activeVersion?.ingredients.length || 0;

  const allSelected = copyTags && copyIngredients && copyNotes && copyRatings;
  const noneSelected = !copyTags && !copyIngredients && !copyNotes && !copyRatings;

  const handleToggleAll = () => {
    if (allSelected || (!allSelected && !noneSelected)) {
      // If all selected or some selected, deselect all
      setCopyTags(false);
      setCopyIngredients(false);
      setCopyNotes(false);
      setCopyRatings(false);
    } else {
      // If none or some selected, select all
      setCopyTags(true);
      setCopyIngredients(true);
      setCopyNotes(true);
      setCopyRatings(true);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || isLoading) {
      return;
    }

    await onConfirm({
      name: name.trim(),
      category,
      copyTags,
      copyIngredients,
      copyNotes,
      copyRatings,
    });
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && !isLoading && onCancel()}>
      <Dialog.Content className="max-w-md">
        <Dialog.Title className="text-lg font-semibold text-neutral-900 dark:text-white">
          Duplicate Recipe
        </Dialog.Title>

        <div className="mt-4 space-y-4">
          {/* Source Recipe Info */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Duplicating from
            </p>
            <p className="mt-1 font-semibold text-neutral-900 dark:text-white">
              {sourceRecipe.name}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge color="gold" variant="soft">
                {formatCategoryLabel(sourceRecipe.category)}
              </Badge>
              {tagCount > 0 && (
                <Badge color="gray" variant="soft">
                  {tagCount} {tagCount === 1 ? "tag" : "tags"}
                </Badge>
              )}
              {activeVersion && (
                <Badge color="blue" variant="soft">
                  Ver. {versionNumber} ({ingredientCount}{" "}
                  {ingredientCount === 1 ? "ingredient" : "ingredients"})
                </Badge>
              )}
            </div>
          </div>

          {/* New Recipe Name */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              New recipe name *
            </label>
            <TextField.Root
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Country Loaf v2"
              className="w-full"
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
              Category
            </label>
            <CategorySelector value={category} onChange={setCategory} />
          </div>

          {/* What to Copy Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                What to copy from original recipe
              </label>
              <Button
                variant="ghost"
                size="1"
                onClick={handleToggleAll}
                className="text-xs"
                type="button"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </Button>
            </div>

            <div className="space-y-2">
              {/* Copy Tags */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <Checkbox
                  checked={copyTags}
                  onCheckedChange={(checked) => {
                    if (checked !== "indeterminate") {
                      setCopyTags(checked);
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    Copy tags
                  </p>
                </div>
                {tagCount > 0 ? (
                  <Badge color="gray" variant="soft" className="text-xs">
                    {tagCount}
                  </Badge>
                ) : (
                  <span className="text-xs text-neutral-400">None</span>
                )}
              </label>

              {/* Copy Ingredients */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <Checkbox
                  checked={copyIngredients}
                  onCheckedChange={(checked) => {
                    if (checked !== "indeterminate") {
                      setCopyIngredients(checked);
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    Copy ingredient list
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    From Ver. {versionNumber}
                  </p>
                </div>
                {ingredientCount > 0 ? (
                  <Badge color="gray" variant="soft" className="text-xs">
                    {ingredientCount}
                  </Badge>
                ) : (
                  <span className="text-xs text-neutral-400">None</span>
                )}
              </label>

              {/* Copy Version Notes */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <Checkbox
                  checked={copyNotes}
                  onCheckedChange={(checked) => {
                    if (checked !== "indeterminate") {
                      setCopyNotes(checked);
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    Copy version notes
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Process notes & next steps
                  </p>
                </div>
              </label>

              {/* Copy Ratings */}
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2.5 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800">
                <Checkbox
                  checked={copyRatings}
                  onCheckedChange={(checked) => {
                    if (checked !== "indeterminate") {
                      setCopyRatings(checked);
                    }
                  }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    Copy version ratings
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Taste, visual, texture + notes
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!name.trim() || isLoading}
              loading={isLoading}
              type="button"
            >
              {isLoading ? "Duplicating..." : "Duplicate Recipe"}
            </Button>
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
