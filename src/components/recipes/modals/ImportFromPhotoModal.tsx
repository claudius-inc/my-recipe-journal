"use client";

import { useState, useMemo, useEffect } from "react";
import { Button, Dialog, TextField } from "@radix-ui/themes";
import { CameraIcon } from "@radix-ui/react-icons";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";
import { CategorySelector } from "../selectors";

interface ExtractedRecipeData {
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string;
    role: IngredientRole;
    notes?: string;
  }>;
  ingredientGroups?: Array<{
    name: string;
    ingredients: Array<{
      name: string;
      quantity: number | null;
      unit: string;
      role: IngredientRole;
      notes?: string;
    }>;
  }>;
  steps?: Array<{ order: number; text: string }>;
  instructions?: string;
  servings?: number;
  cookTime?: string;
  metadata?: Record<string, string | number>;
}

interface ImportFromPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: ExtractedRecipeData) => Promise<void>;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportFromPhotoModal({
  isOpen,
  onClose,
  onImport,
}: ImportFromPhotoModalProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedRecipeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Editable fields for preview
  const [editableName, setEditableName] = useState("");
  const [editableCategory, setEditableCategory] = useState<RecipeCategory>({
    primary: "baking",
    secondary: "bread",
  });
  const [editableDescription, setEditableDescription] = useState("");

  // Stable blob URL that gets revoked on cleanup
  const previewUrl = useMemo(
    () => (selectedFile ? URL.createObjectURL(selectedFile) : null),
    [selectedFile],
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Invalid file type. Please upload a JPEG, PNG, or WebP image.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (${formatFileSize(file.size)}). Maximum size is 5MB.`;
    }
    return null;
  };

  const handleFileSelected = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setExtractError(error);
      return;
    }

    setSelectedFile(file);
    setExtractError(null);
    setExtractedData(null);

    await handleExtract(file);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await handleFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await handleFileSelected(file);
  };

  const handleExtract = async (file: File) => {
    setIsExtracting(true);
    setExtractError(null);
    setExtractedData(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch("/api/recipes/from-photo", {
        method: "POST",
        body: formData,
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
      setExtractedData(data);
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : "Failed to extract recipe",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedFile) return;
    await handleExtract(selectedFile);
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
        ingredientGroups: extractedData.ingredientGroups,
      };

      await onImport(finalData);

      // Reset form
      setSelectedFile(null);
      setExtractedData(null);
      setEditableName("");
      setEditableDescription("");
      setExtractError(null);
      onClose();
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : "Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setExtractedData(null);
    setEditableName("");
    setEditableDescription("");
    setExtractError(null);
    onClose();
  };

  // Use ingredient groups from extraction, or wrap flat ingredients in a single group
  const displayGroups =
    extractedData?.ingredientGroups && extractedData.ingredientGroups.length > 0
      ? extractedData.ingredientGroups
      : extractedData?.ingredients
        ? [{ name: "Ingredients", ingredients: extractedData.ingredients }]
        : [];

  const totalIngredientCount = displayGroups.reduce(
    (sum, group) => sum + group.ingredients.length,
    0,
  );

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Content maxWidth="600px">
        <Dialog.Title>Import Recipe from Photo</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Upload a photo of a recipe to automatically extract ingredients and
          instructions.
        </Dialog.Description>

        {!extractedData && !isExtracting ? (
          // Step 1: File selection
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Recipe Photo</label>
              <div className="mt-1">
                <label
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                    isDragOver
                      ? "border-blue-400 bg-blue-50"
                      : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <CameraIcon className="w-8 h-8 mb-3 text-neutral-400" />
                    <p className="mb-2 text-sm text-neutral-500">
                      <span className="font-semibold">Click to upload</span> or drag and
                      drop
                    </p>
                    <p className="text-xs text-neutral-500">
                      JPEG, PNG, or WebP (Max 5MB)
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {extractError}
                {selectedFile && (
                  <button
                    onClick={handleRetry}
                    className="ml-2 underline hover:no-underline"
                  >
                    Try again
                  </button>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close>
                <Button variant="soft">Cancel</Button>
              </Dialog.Close>
            </div>
          </div>
        ) : isExtracting ? (
          // Step 2: Extraction in progress
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-neutral-600">Analyzing recipe photo...</p>
              <p className="text-xs text-neutral-500 mt-2">This may take 10-30 seconds</p>
            </div>

            {selectedFile && previewUrl && (
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Uploaded Photo
                </label>
                <div className="mt-1">
                  <img
                    src={previewUrl}
                    alt="Uploaded recipe"
                    className="w-full h-48 object-cover rounded-lg border border-neutral-200"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="soft" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Step 3: Preview and edit
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              Recipe extracted successfully! Review and edit before saving.
            </div>

            {selectedFile && previewUrl && (
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Source Photo
                </label>
                <div className="mt-1">
                  <img
                    src={previewUrl}
                    alt="Recipe source"
                    className="w-full h-48 object-cover rounded-lg border border-neutral-200"
                  />
                  <p className="mt-1 text-xs text-neutral-500">
                    {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="photo-recipe-name"
                className="text-sm font-medium text-neutral-700"
              >
                Recipe Name
              </label>
              <TextField.Root
                id="photo-recipe-name"
                value={editableName}
                onChange={(e) => setEditableName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">Category</label>
              <div className="mt-1">
                <CategorySelector
                  value={editableCategory}
                  onChange={setEditableCategory}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="photo-recipe-description"
                className="text-sm font-medium text-neutral-700"
              >
                Description
              </label>
              <TextField.Root
                id="photo-recipe-description"
                value={editableDescription}
                onChange={(e) => setEditableDescription(e.target.value)}
                className="mt-1"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-neutral-700">
                Ingredients ({totalIngredientCount})
              </label>
              <p className="text-xs text-neutral-500 mb-1">
                You can edit ingredients after saving.
              </p>
              <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                {displayGroups.map((group) => (
                  <div key={group.name} className="mb-3 last:mb-0">
                    <h4 className="font-semibold text-neutral-800 mb-1">{group.name}</h4>
                    <ul className="space-y-1 ml-2">
                      {group.ingredients.map((ing, idx) => (
                        <li key={idx} className="text-neutral-700">
                          {ing.quantity} {ing.unit} {ing.name}
                          {ing.notes && (
                            <span className="ml-2 text-neutral-500">({ing.notes})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {extractedData?.steps && extractedData.steps.length > 0 && (
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Recipe Steps ({extractedData.steps.length})
                </label>
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                  <ol className="space-y-2">
                    {extractedData.steps.map((step) => (
                      <li key={step.order} className="flex gap-2">
                        <span className="font-semibold text-neutral-500">
                          {step.order}.
                        </span>
                        <span className="flex-1 text-neutral-700">{step.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            )}

            {extractedData?.instructions && (
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Instructions
                </label>
                <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  {extractedData.instructions}
                </div>
              </div>
            )}

            {(extractedData?.cookTime || extractedData?.servings) && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {extractedData?.cookTime && (
                  <div>
                    <span className="font-medium text-neutral-700">Cook Time:</span>
                    <span className="ml-2 text-neutral-600">
                      {extractedData.cookTime}
                    </span>
                  </div>
                )}
                {extractedData?.servings && (
                  <div>
                    <span className="font-medium text-neutral-700">Servings:</span>
                    <span className="ml-2 text-neutral-600">
                      {extractedData.servings}
                    </span>
                  </div>
                )}
              </div>
            )}

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
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
