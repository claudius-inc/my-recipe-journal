import { useState, useCallback } from "react";
import type { RecipeVersion } from "@/types/recipes";
import { Button, IconButton } from "@radix-ui/themes";
import { Cross2Icon, PlusIcon, TrashIcon } from "@radix-ui/react-icons";
import { UploadProgress } from "@/components/ui/UploadProgress";

export interface PhotoSectionProps {
  version: RecipeVersion;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  uploadError?: string;
  isRemoving?: boolean;
}

export function PhotoUploadSection({
  version,
  onUpload,
  onRemove,
  isUploading,
  uploadProgress = 0,
  uploadError,
  isRemoving = false,
}: PhotoSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    if (version.photoUrl) {
      setIsModalOpen(true);
    }
  }, [version.photoUrl]);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCloseModal();
      }
    },
    [handleCloseModal],
  );

  const handleRemoveAndClose = useCallback(async () => {
    await onRemove();
    setIsModalOpen(false);
  }, [onRemove]);

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-800">Snapshot</h3>
            <p className="text-xs text-neutral-500 truncate">Capture progress photos</p>
          </div>

          {/* Horizontally scrollable thumbnail container */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent py-1 max-w-[calc(100%-120px)]">
            {/* Photo thumbnail */}
            {version.photoUrl && (
              <button
                type="button"
                onClick={handleOpenModal}
                className="flex-shrink-0 w-20 aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                aria-label="View photo"
              >
                <img
                  src={version.photoUrl}
                  alt="Recipe snapshot"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </button>
            )}

            {/* Upload button - square, same size as thumbnails */}
            <label className="flex-shrink-0 w-20 aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
              {isUploading ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-neutral-500">{uploadProgress}%</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <PlusIcon className="w-5 h-5 text-neutral-400" />
                  <span className="text-[10px] text-neutral-500">Add</span>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void onUpload(file);
                  }
                }}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mt-3">
            <UploadProgress
              isUploading={false}
              progress={0}
              fileName="Photo"
              error={uploadError}
            />
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {isModalOpen && version.photoUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center"
          onKeyDown={handleKeyDown}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCloseModal}
          />

          {/* Modal content */}
          <div className="relative z-10 max-w-[90vw] max-h-[90vh] flex flex-col items-center gap-4">
            {/* Close button */}
            <div className="absolute -top-12 right-0 flex gap-2">
              <IconButton
                size="2"
                variant="soft"
                color="red"
                onClick={handleRemoveAndClose}
                disabled={isRemoving}
                aria-label="Remove photo"
              >
                <TrashIcon className="w-4 h-4" />
              </IconButton>
              <IconButton
                size="2"
                variant="soft"
                color="gray"
                onClick={handleCloseModal}
                aria-label="Close"
              >
                <Cross2Icon className="w-4 h-4" />
              </IconButton>
            </div>

            {/* Full-size image */}
            <img
              src={version.photoUrl}
              alt="Recipe snapshot - full size"
              className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl"
            />

            {/* Remove button below image (alternative placement) */}
            <div className="flex gap-3">
              <Button
                size="2"
                variant="soft"
                color="red"
                onClick={handleRemoveAndClose}
                disabled={isRemoving}
              >
                <TrashIcon className="w-4 h-4" />
                {isRemoving ? "Removing…" : "Remove photo"}
              </Button>
              <Button size="2" variant="soft" color="gray" onClick={handleCloseModal}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
