import { useState, useCallback } from "react";
import { useRecipeStore } from "@/store/RecipeStore";
import { useToast } from "@/context/ToastContext";
import type { VersionPhoto } from "@/types/recipes";

interface UsePhotoUploadOptions {
  recipeId: string;
  versionId: string;
}

export function usePhotoUpload({ recipeId, versionId }: UsePhotoUploadOptions) {
  const { refresh } = useRecipeStore();
  const { addToast } = useToast();

  const [isUploading, setIsUploading] = useState(false);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [photoUploadError, setPhotoUploadError] = useState<string | undefined>();
  const [isRemovingPhoto, setIsRemovingPhoto] = useState(false);

  const addPhoto = useCallback(
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
        let photoUrl: string;
        let r2Key: string | undefined;

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
          const presignedData = await presignedResponse.json();
          const { presignedUrl, publicUrl, r2Key: uploadR2Key } = presignedData;

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

          photoUrl = publicUrl;
          r2Key = uploadR2Key;
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

          photoUrl = dataUrl;
        }

        // Save photo to database via API
        const response = await fetch(
          `/api/recipes/${recipeId}/versions/${versionId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoUrl, r2Key }),
          },
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to save photo");
        }

        setPhotoUploadProgress(0);
        addToast("Photo added successfully", "success");

        // Refresh recipe data to get updated photos
        await refresh();
      } catch (error) {
        setPhotoUploadError(
          error instanceof Error ? error.message : "Failed to upload photo",
        );
        addToast("Failed to upload photo", "error");
      } finally {
        setIsUploading(false);
      }
    },
    [recipeId, versionId, addToast, refresh],
  );

  const removePhoto = useCallback(
    async (photo: VersionPhoto) => {
      setIsRemovingPhoto(true);
      try {
        // Delete from database first
        const response = await fetch(
          `/api/recipes/${recipeId}/versions/${versionId}/photos`,
          {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoId: photo.id }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to remove photo from database");
        }

        const result = await response.json();

        // Delete from R2 if applicable
        if (result.r2Key) {
          try {
            await fetch("/api/photos/delete", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                r2Key: result.r2Key,
                photoUrl: photo.photoUrl,
              }),
            });
          } catch (error) {
            console.error("Failed to delete from R2:", error);
            // Continue anyway - database reference is already cleared
          }
        }

        addToast("Photo removed successfully", "success");

        // Refresh recipe data
        await refresh();
      } catch (error) {
        addToast("Failed to remove photo", "error");
      } finally {
        setIsRemovingPhoto(false);
      }
    },
    [recipeId, versionId, addToast, refresh],
  );

  const reorderPhotos = useCallback(
    async (photoIds: string[]) => {
      try {
        const response = await fetch(
          `/api/recipes/${recipeId}/versions/${versionId}/photos`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ photoIds }),
          },
        );

        if (!response.ok) {
          throw new Error("Failed to reorder photos");
        }

        // Refresh recipe data
        await refresh();
      } catch (error) {
        addToast("Failed to reorder photos", "error");
      }
    },
    [recipeId, versionId, addToast, refresh],
  );

  return {
    addPhoto,
    removePhoto,
    reorderPhotos,
    isUploading,
    photoUploadProgress,
    photoUploadError,
    isRemovingPhoto,
    // Legacy aliases for backward compatibility
    handlePhotoUpload: addPhoto,
  };
}
