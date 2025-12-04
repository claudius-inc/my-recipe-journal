import type { RecipeVersion } from "@/types/recipes";
import { Button } from "@radix-ui/themes";
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
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800">Snapshot</h3>
          <p className="text-xs text-neutral-500">
            Capture the final result of this iteration to compare progress over time.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-100">
          {isUploading ? "Uploading…" : "Upload photo"}
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

      {/* Upload progress/error */}
      {(isUploading || uploadError) && (
        <div className="mt-4">
          <UploadProgress
            isUploading={isUploading}
            progress={uploadProgress}
            fileName="Photo"
            error={uploadError}
          />
        </div>
      )}

      {version.photoUrl ? (
        <div className="mt-4 space-y-2">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border border-neutral-200">
            <img
              src={version.photoUrl}
              alt="Recipe result"
              loading="lazy"
              decoding="async"
              className="h-auto w-full object-cover max-h-[500px] object-center"
            />
          </div>
          <div className="flex justify-center">
            <Button
              onClick={onRemove}
              disabled={isRemoving}
              variant="ghost"
              color="red"
              size="1"
            >
              {isRemoving ? "Removing…" : "Remove photo"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-neutral-500">
          No photo attached yet. Tap upload after each bake or mix to build your visual
          log.
        </p>
      )}
    </section>
  );
}
