"use client";

import { useState, useMemo, useEffect } from "react";
import { Button, Dialog } from "@radix-ui/themes";
import { CameraIcon } from "@radix-ui/react-icons";
import type { CreateRecipeWithDataPayload } from "@/store/RecipeStore";
import { ImportPreviewEditor, type ExtractedForPreview } from "./ImportPreviewEditor";

interface ImportFromPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: CreateRecipeWithDataPayload) => Promise<void>;
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
  const [extracted, setExtracted] = useState<ExtractedForPreview | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  const handleExtract = async (file: File) => {
    setIsExtracting(true);
    setExtractError(null);
    setExtracted(null);
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
      setExtracted((await response.json()) as ExtractedForPreview);
    } catch (error) {
      setExtractError(
        error instanceof Error ? error.message : "Failed to extract recipe",
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    const error = validateFile(file);
    if (error) {
      setExtractError(error);
      return;
    }
    setSelectedFile(file);
    setExtractError(null);
    setExtracted(null);
    await handleExtract(file);
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

  const reset = () => {
    setSelectedFile(null);
    setExtracted(null);
    setExtractError(null);
  };

  const handleCancel = () => {
    reset();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Content maxWidth="640px">
        <Dialog.Title>Import Recipe from Photo</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Upload a photo of a recipe to automatically extract ingredients and
          instructions.
        </Dialog.Description>

        {!extracted && !isExtracting ? (
          <div className="space-y-4">
            <label
              className={`flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${
                isDragOver
                  ? "border-blue-400 bg-blue-50"
                  : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleFileSelected(file);
              }}
            >
              <CameraIcon className="mb-3 h-8 w-8 text-neutral-400" />
              <p className="mb-1 text-sm text-neutral-500">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-neutral-500">JPEG, PNG, or WebP (Max 5MB)</p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFileSelected(file);
                }}
                className="hidden"
              />
            </label>

            {extractError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {extractError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Dialog.Close>
                <Button variant="soft">Cancel</Button>
              </Dialog.Close>
            </div>
          </div>
        ) : isExtracting ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
              <p className="text-sm text-neutral-600">Analyzing recipe photo...</p>
              <p className="mt-2 text-xs text-neutral-500">This may take 10-30 seconds</p>
            </div>
            {selectedFile && previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Uploaded recipe"
                className="h-44 w-full rounded-lg border border-neutral-200 object-cover"
              />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="soft" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : extracted ? (
          <ImportPreviewEditor
            extracted={extracted}
            saving={isSaving}
            error={extractError}
            onBack={reset}
            onSave={handleSave}
          />
        ) : null}
      </Dialog.Content>
    </Dialog.Root>
  );
}
