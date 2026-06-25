"use client";

import { useState } from "react";
import { Button, Dialog, TextField } from "@radix-ui/themes";
import type { CreateRecipeWithDataPayload } from "@/store/RecipeStore";
import { ImportPreviewEditor, type ExtractedForPreview } from "./ImportPreviewEditor";

interface ImportFromUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CreateRecipeWithDataPayload) => Promise<void>;
}

export function ImportFromUrlModal({
  isOpen,
  onClose,
  onImport,
}: ImportFromUrlModalProps) {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedForPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setUrl("");
    setExtracted(null);
    setExtractError(null);
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setExtractError("Please enter a URL");
      return;
    }
    setIsExtracting(true);
    setExtractError(null);
    setExtracted(null);
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
      setExtracted((await response.json()) as ExtractedForPreview);
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : "Failed to extract recipe",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (payload: CreateRecipeWithDataPayload) => {
    setIsSaving(true);
    setExtractError(null);
    try {
      await onImport(payload);
      reset();
    } catch (error) {
      setExtractError(error instanceof Error ? error.message : "Failed to save recipe");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title>Import Recipe from URL</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Paste a recipe URL to automatically extract ingredients and instructions.
        </Dialog.Description>

        {!extracted ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-neutral-700">Recipe URL</label>
              <TextField.Root
                placeholder="https://www.example.com/recipe/..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isExtracting}
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !isExtracting) handleExtract();
                }}
              />
              <p className="mt-1 text-xs text-neutral-500">
                Most recipe sites are supported via structured data or AI extraction.
              </p>
            </div>

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
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
          <ImportPreviewEditor
            extracted={extracted}
            saving={isSaving}
            error={extractError}
            onBack={() => setExtracted(null)}
            onSave={handleSave}
          />
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
