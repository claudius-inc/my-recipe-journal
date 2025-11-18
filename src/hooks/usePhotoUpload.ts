import { useState, useCallback } from "react";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";

interface UsePhotoUploadOptions {
  recipeId: string;
  versionId: string;
}

export function usePhotoUpload({ recipeId, versionId }: UsePhotoUploadOptions) {
  const { updateVersion } = useRecipeStore();
  const { addToast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | undefined>();
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  const handlePhotoUpload = useCallback(
    async (file: File) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setPhotoUploadError("Please select a valid image file");
        return;
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        setPhotoUploadError("Image must be smaller than 5MB");
        return;
      }

      setIsUploading(true);
      setPhotoUploadError(undefined);
      setPhotoUploadProgress(0);

      try {
        // Try R2 presigned URL upload first
        const presignedResponse = await fetch("/api/photos/presigned-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipeId,
            versionId,
            contentType: file.type,
            fileSize: file.size,
          }),
        });

        if (presignedResponse.ok) {
          // R2 is configured - use presigned URL upload
          const { presignedUrl, publicUrl, r2Key } = await presignedResponse.json();

          // Upload directly to R2 with progress tracking
          const xhr = new XMLHttpRequest();

          await new Promise<void>((resolve, reject) => {
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setPhotoUploadProgress(progress);
              }
            });

            xhr.addEventListener("load", () => {
              if (xhr.status === 200) {
                resolve();
              } else {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            });

            xhr.addEventListener("error", () =>
              reject(new Error("Network error during upload")),
            );
            xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

            xhr.open("PUT", presignedUrl);
            xhr.setRequestHeader("Content-Type", file.type);
            xhr.send(file);
          });

          // Update database with R2 URL and key
          await updateVersion(recipeId, versionId, {
            photoUrl: publicUrl,
            r2Key,
          });

          setPhotoUploadProgress(0);
          addToast("Photo uploaded successfully", "success");
        } else {
          // R2 not configured - fallback to Base64
          const reader = new FileReader();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onprogress = (event) => {
              if (event.lengthComputable) {
                const progress = Math.round((event.loaded / event.total) * 100);
                setPhotoUploadProgress(progress);
              }
            };
            reader.onload = () => {
              setPhotoUploadProgress(100);
              resolve(typeof reader.result === "string" ? reader.result : "");
            };
            reader.onerror = () =>
              reject(reader.error ?? new Error("Failed to read image"));
            reader.readAsDataURL(file);
          });

          await updateVersion(recipeId, versionId, {
            photoUrl: dataUrl,
          });
          setPhotoUploadProgress(0);
          addToast("Photo uploaded (using database storage)", "success");
        }
      } catch (error) {
        setPhotoUploadError(
          error instanceof Error ? error.message : "Failed to upload photo",
        );
        addToast("Failed to upload photo", "error");
      } finally {
        setIsUploading(false);
      }
    },
    [recipeId, versionId, updateVersion, addToast],
  );

  const removePhoto = useCallback(
    async (photoUrl: string | null, r2Key: string | null) => {
      setIsRemovingPhoto(true);
      try {
        // Delete from R2 if using R2 storage
        if (r2Key) {
          try {
            await fetch("/api/photos/delete", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                r2Key,
                photoUrl,
              }),
            });
          } catch (error) {
            console.error("Failed to delete from R2:", error);
            // Continue anyway to clear database reference
          }
        }

        // Clear database references
        await updateVersion(recipeId, versionId, {
          photoUrl: null,
          r2Key: null,
        });
        addToast("Photo removed successfully", "success");
      } catch (error) {
        addToast("Failed to remove photo", "error");
      } finally {
        setIsRemovingPhoto(false);
      }
    },
    [recipeId, versionId, updateVersion, addToast],
  );

  return {
    handlePhotoUpload,
    removePhoto,
    isUploading,
    photoUploadProgress,
    photoUploadError,
    isRemovingPhoto,
  };
}
