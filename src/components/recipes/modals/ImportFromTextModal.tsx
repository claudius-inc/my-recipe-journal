"use client";

import { useState } from "react";
import { Button, Dialog, TextArea } from "@radix-ui/themes";
import type { CreateRecipeWithDataPayload } from "@/store/RecipeStore";
import { ImportPreviewEditor, type ExtractedForPreview } from "./ImportPreviewEditor";

interface ImportFromTextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CreateRecipeWithDataPayload) => Promise<void>;
}

export function ImportFromTextModal({
  isOpen,
  onClose,
  onImport,
}: ImportFromTextModalProps) {
  const [text, setText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedForPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = () => {
    setText("");
    setExtracted(null);
    setError(null);
  };

  const handleExtract = async () => {
    if (text.trim().length < 20) {
      setError("Please paste a full recipe (ingredients and steps).");
      return;
    }
    setIsExtracting(true);
    setError(null);
    try {
      const response = await fetch("/api/recipes/from-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to extract recipe");
      }
      setExtracted((await response.json()) as ExtractedForPreview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to extract recipe");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (payload: CreateRecipeWithDataPayload) => {
    setIsSaving(true);
    setError(null);
    try {
      await onImport(payload);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save recipe");
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
        <Dialog.Title>Paste a Recipe</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Paste recipe text (from an email, blog, or note) and we&apos;ll structure it for
          you.
        </Dialog.Description>

        {!extracted ? (
          <div className="space-y-4">
            <TextArea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "e.g.\nSourdough Loaf\n\n500g bread flour\n350g water\n10g salt\n\n1. Mix...\n2. Bake at 230C..."
              }
              rows={12}
              disabled={isExtracting}
            />
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close>
                <Button variant="soft" disabled={isExtracting}>
                  Cancel
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleExtract}
                disabled={isExtracting || text.trim().length < 20}
              >
                {isExtracting ? "Extracting..." : "Extract Recipe"}
              </Button>
            </div>
          </div>
        ) : (
          <ImportPreviewEditor
            extracted={extracted}
            saving={isSaving}
            error={error}
            onBack={() => setExtracted(null)}
            onSave={handleSave}
          />
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
