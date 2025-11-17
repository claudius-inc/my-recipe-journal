"use client";

import { useState } from "react";
import { Button, Dialog, TextField } from "@radix-ui/themes";
import { cn } from "@/lib/utils";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";
import { CategorySelector } from "./CategorySelector";

interface ExtractedRecipeData {
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string;
  }>;
  steps?: Array<{ order: number; text: string }>;
  instructions?: string;
  servings?: number;
  sourceUrl: string;
  imageUrl?: string;
}

interface ImportFromUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ExtractedRecipeData) => Promise<void>;
}

export function ImportFromUrlModal({
  isOpen,
  onClose,
  onImport,
}: ImportFromUrlModalProps) {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedRecipeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Editable fields for preview
  const [editableName, setEditableName] = useState("");
  const [editableCategory, setEditableCategory] = useState<RecipeCategory>({
    primary: "baking",
    secondary: "bread",
  });
  const [editableDescription, setEditableDescription] = useState("");
  const [editableImageUrl, setEditableImageUrl] = useState<string | undefined>();

  const handleExtract = async () => {
    if (!url.trim()) {
      setExtractError("Please enter a URL");
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    setExtractedData(null);

    try {
      const response = await fetch("/api/recipes/from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract recipe");
      }

      const data = (await response.json()) as ExtractedRecipeData;

      // Populate editable fields
      setEditableName(data.name);
      setEditableCategory(data.category);
      setEditableDescription(data.description || "");
      setEditableImageUrl(data.imageUrl);
      setExtractedData(data);
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : "Failed to extract recipe",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData) return;

    setIsSaving(true);
    try {
      // Merge edited fields back into extracted data
      const finalData: ExtractedRecipeData = {
        ...extractedData,
        name: editableName,
        category: editableCategory,
        description: editableDescription || undefined,
        imageUrl: editableImageUrl,
      };

      await onImport(finalData);

      // Reset form
      setUrl("");
      setExtractedData(null);
      setEditableName("");
      setEditableDescription("");
      setEditableImageUrl(undefined);
      setExtractError(null);
      onClose();
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : "Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setUrl("");
    setExtractedData(null);
    setEditableName("");
    setEditableDescription("");
    setEditableImageUrl(undefined);
    setExtractError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>Import Recipe from URL</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Paste a recipe URL to automatically extract ingredients and instructions.
        </Dialog.Description>

        {!extractedData ? (
          // Step 1: URL input
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Recipe URL
              </label>
              <TextField.Root
                placeholder="https://www.cotta.jp/recipe/recipe.php?recipeid=00016428"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isExtracting}
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isExtracting) {
                    handleExtract();
                  }
                }}
              />
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Supports Cotta.jp and many other recipe websites via AI extraction
              </p>
            </div>

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {extractError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close>
                <Button variant="soft" disabled={isExtracting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button onClick={handleExtract} disabled={isExtracting || !url.trim()}>
                {isExtracting ? "Extracting..." : "Extract Recipe"}
              </Button>
            </div>
          </div>
        ) : (
          // Step 2: Preview and edit
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400">
              Recipe extracted successfully! Review and edit before saving.
            </div>

            {editableImageUrl && (
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Recipe Photo
                </label>
                <div className="mt-1 relative group">
                  <img
                    src={editableImageUrl}
                    alt="Recipe preview"
                    className="w-full h-48 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700"
                  />
                  <button
                    onClick={() => setEditableImageUrl(undefined)}
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove image"
                    type="button"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Recipe Name
              </label>
              <TextField.Root
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Category
              </label>
              <div className="mt-1">
                <CategorySelector
                  value={editableCategory}
                  onChange={setEditableCategory}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Description
              </label>
              <TextField.Root
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                className="mt-1"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Ingredients ({extractedData.ingredients.length})
              </label>
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <ul className="space-y-1">
                  {extractedData.ingredients.map((ing, idx) => (
                    <li key={idx} className="text-neutral-700 dark:text-neutral-300">
                      {ing.quantity} {ing.unit} {ing.name}
                      {ing.notes && (
                        <span className="ml-2 text-neutral-500">({ing.notes})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {extractedData.steps && extractedData.steps.length > 0 && (
              <div>
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Recipe Steps ({extractedData.steps.length})
                </label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                  <ol className="space-y-2">
                    {extractedData.steps.map((step) => (
                      <li key={step.order} className="flex gap-2">
                        <span className="font-semibold text-neutral-500">
                          {step.order}.
                        </span>
                        <span className="flex-1 text-neutral-700 dark:text-neutral-300">
                          {step.text}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            <div className="text-xs text-neutral-500">
              Source:{" "}
              <a
                href={extractedData.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {extractedData.sourceUrl}
              </a>
            </div>

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
                {extractError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="soft"
                onClick={() => {
                  setExtractedData(null);
                  setExtractError(null);
                }}
                disabled={isSaving}
              >
                Back
              </Button>
              <Button onClick={handleSave} disabled={isSaving || !editableName.trim()}>
                {isSaving ? "Saving..." : "Save Recipe"}
              </Button>
            </div>
          </div>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
