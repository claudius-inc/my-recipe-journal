import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { RecipeVersion, VersionPhoto } from "@/types/recipes";
import { IconButton, Select } from "@radix-ui/themes";
import {
  Cross2Icon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  CameraIcon,
  ImageIcon,
} from "@radix-ui/react-icons";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { PhotoCropModal } from "@/components/ui/PhotoCropModal";
import imageCompression from "browser-image-compression";

// A photo plus which version it belongs to, for the cross-version gallery.
export interface TaggedPhoto extends VersionPhoto {
  versionId: string;
  versionLabel: string;
}

export interface PhotoSectionProps {
  version: RecipeVersion;
  onUpload: (file: File, targetVersionId: string) => Promise<void>;
  onRemove: (photo: VersionPhoto, versionId: string) => Promise<void>;
  onReorder: (photoIds: string[]) => Promise<void>;
  onUpdateCaption?: (photoId: string, caption: string | null) => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  uploadError?: string;
  isRemoving?: boolean;
  // Cross-version support
  currentVersionId: string;
  currentVersionLabel: string;
  /** All versions, for the upload-target selector. */
  versionOptions?: Array<{ id: string; label: string }>;
  /** Photos belonging to OTHER versions (shown read-only, tagged). */
  otherPhotos?: TaggedPhoto[];
}

const MAX_PHOTOS = 10;

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: "image/webp" as const,
};

export function PhotoUploadSection({
  version,
  onUpload,
  onRemove,
  onReorder,
  onUpdateCaption,
  isUploading,
  uploadProgress = 0,
  uploadError,
  isRemoving = false,
  currentVersionId,
  currentVersionLabel,
  versionOptions,
  otherPhotos = [],
}: PhotoSectionProps) {
  // Which version a newly uploaded photo attaches to (defaults to current).
  const [uploadTargetVersionId, setUploadTargetVersionId] = useState(currentVersionId);
  useEffect(() => {
    setUploadTargetVersionId(currentVersionId);
  }, [currentVersionId]);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [draggedThumbnailId, setDraggedThumbnailId] = useState<string | null>(null);

  // Optimistic local photos state for instant reordering
  const [localPhotos, setLocalPhotos] = useState<VersionPhoto[] | null>(null);

  // Track which photo is being removed for optimistic UI
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  // Delete confirmation state
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<TaggedPhoto | null>(null);

  // Touch drag state for mobile reordering
  const [touchDragId, setTouchDragId] = useState<string | null>(null);
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const thumbnailRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const touchStartTimeout = useRef<NodeJS.Timeout | null>(null);

  // Touch/mouse gesture refs for gallery
  const touchStartDistance = useRef(0);
  const touchStartScale = useRef(1);
  const touchStartX = useRef(0);
  const lastTouchX = useRef(0);
  const imageRef = useRef<HTMLImageElement>(null);
  const isMouseDragging = useRef(false);
  const mouseStartX = useRef(0);

  // Crop modal state
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("photo.jpg");

  // Drop zone state
  const [isDropHovering, setIsDropHovering] = useState(false);
  const dropZoneRef = useRef<HTMLElement>(null);

  // Caption editing state
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");

  // Use local photos if set (optimistic), otherwise use version.photos
  const photos = useMemo(
    () => localPhotos ?? version.photos ?? [],
    [localPhotos, version.photos],
  );
  const canAddMore = photos.length < MAX_PHOTOS;

  // Current-version photos tagged, then other versions' photos. The lightbox
  // gallery iterates this combined list so any version's photos are viewable.
  const galleryPhotos = useMemo<TaggedPhoto[]>(
    () => [
      ...photos.map((p) => ({
        ...p,
        versionId: currentVersionId,
        versionLabel: currentVersionLabel,
      })),
      ...otherPhotos,
    ],
    [photos, otherPhotos, currentVersionId, currentVersionLabel],
  );

  // Sync local photos when version.photos changes
  if (localPhotos !== null && version.photos) {
    const versionIds = version.photos.map((p) => p.id).join(",");
    const localIds = localPhotos.map((p) => p.id).join(",");
    if (versionIds !== localIds) {
      const versionIdSet = new Set(version.photos.map((p) => p.id));
      const localIdSet = new Set(localPhotos.map((p) => p.id));
      const samePhotos =
        versionIdSet.size === localIdSet.size &&
        Array.from(versionIdSet).every((id) => localIdSet.has(id));
      if (!samePhotos) {
        setLocalPhotos(null);
      }
    }
  }

  // === FILE INTAKE (shared entry point for file input, drop, paste) ===

  const handleFileSelected = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setPendingFileName(file.name);
    const url = URL.createObjectURL(file);
    setCropImageUrl(url);
  }, []);

  const handleCropConfirm = useCallback(
    async (croppedBlob: Blob) => {
      // Clean up object URL
      if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
      setCropImageUrl(null);

      // Compress before upload
      try {
        const compressedFile = await imageCompression(
          new File([croppedBlob], pendingFileName, { type: croppedBlob.type }),
          COMPRESSION_OPTIONS,
        );
        await onUpload(compressedFile, uploadTargetVersionId);
      } catch {
        // Fallback: upload without compression
        const file = new File([croppedBlob], pendingFileName, { type: croppedBlob.type });
        await onUpload(file, uploadTargetVersionId);
      }
    },
    [cropImageUrl, pendingFileName, onUpload, uploadTargetVersionId],
  );

  const handleCropCancel = useCallback(() => {
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl);
    setCropImageUrl(null);
  }, [cropImageUrl]);

  // === DRAG & DROP onto section ===

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes("Files")) {
      setIsDropHovering(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only hide if leaving the drop zone (not entering a child)
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDropHovering(false);
    }
  }, []);

  const handleDropFile = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDropHovering(false);
      if (!canAddMore) return;
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith("image/")) {
        handleFileSelected(file);
      }
    },
    [canAddMore, handleFileSelected],
  );

  // === PASTE from clipboard ===

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!canAddMore) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) handleFileSelected(file);
          break;
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [canAddMore, handleFileSelected]);

  // === GALLERY ===

  const handleOpenGallery = useCallback((index: number) => {
    setActivePhotoIndex(index);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsGalleryOpen(true);
  }, []);

  const handleCloseGallery = useCallback(() => {
    setIsGalleryOpen(false);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setEditingCaptionId(null);
  }, []);

  const goToPrev = useCallback(() => {
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : galleryPhotos.length - 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setEditingCaptionId(null);
  }, [galleryPhotos.length]);

  const goToNext = useCallback(() => {
    setActivePhotoIndex((prev) => (prev < galleryPhotos.length - 1 ? prev + 1 : 0));
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setEditingCaptionId(null);
  }, [galleryPhotos.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (editingCaptionId) return; // Don't capture keys while editing caption
      if (e.key === "Escape") handleCloseGallery();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    },
    [handleCloseGallery, goToPrev, goToNext, editingCaptionId],
  );

  // Touch swipe handling for gallery
  const handleGalleryTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistance.current = Math.hypot(dx, dy);
        touchStartScale.current = scale;
      } else if (e.touches.length === 1) {
        touchStartX.current = e.touches[0].clientX;
        lastTouchX.current = e.touches[0].clientX;

        if (scale > 1) {
          setIsDragging(true);
          setDragStartPos({
            x: e.touches[0].clientX - position.x,
            y: e.touches[0].clientY - position.y,
          });
        }
      }
    },
    [scale, position],
  );

  const handleGalleryTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.hypot(dx, dy);
        const newScale = Math.min(
          Math.max(touchStartScale.current * (distance / touchStartDistance.current), 1),
          4,
        );
        setScale(newScale);

        if (newScale === 1) {
          setPosition({ x: 0, y: 0 });
        }
      } else if (e.touches.length === 1) {
        lastTouchX.current = e.touches[0].clientX;

        if (isDragging && scale > 1) {
          setPosition({
            x: e.touches[0].clientX - dragStartPos.x,
            y: e.touches[0].clientY - dragStartPos.y,
          });
        }
      }
    },
    [isDragging, scale, dragStartPos],
  );

  const handleGalleryTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.changedTouches.length === 1 && scale === 1) {
        const deltaX = lastTouchX.current - touchStartX.current;
        const threshold = 50;

        if (deltaX > threshold) {
          goToPrev();
        } else if (deltaX < -threshold) {
          goToNext();
        }
      }

      setIsDragging(false);
    },
    [scale, goToPrev, goToNext],
  );

  // Double-tap to zoom
  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback(
    (_e: React.TouchEvent) => {
      const now = Date.now();
      if (now - lastTapTime.current < 300) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2);
        }
      }
      lastTapTime.current = now;
    },
    [scale],
  );

  // Mouse drag for desktop gallery navigation
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (scale > 1) {
        setIsDragging(true);
        setDragStartPos({
          x: e.clientX - position.x,
          y: e.clientY - position.y,
        });
      } else {
        isMouseDragging.current = true;
        mouseStartX.current = e.clientX;
      }
      e.preventDefault();
    },
    [scale, position],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging && scale > 1) {
        setPosition({
          x: e.clientX - dragStartPos.x,
          y: e.clientY - dragStartPos.y,
        });
      }
    },
    [isDragging, scale, dragStartPos],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (isMouseDragging.current && scale === 1) {
        const deltaX = e.clientX - mouseStartX.current;
        const threshold = 50;

        if (deltaX > threshold) {
          goToPrev();
        } else if (deltaX < -threshold) {
          goToNext();
        }
      }
      isMouseDragging.current = false;
      setIsDragging(false);
    },
    [scale, goToPrev, goToNext],
  );

  const handleMouseLeave = useCallback(() => {
    isMouseDragging.current = false;
    setIsDragging(false);
  }, []);

  // Remove photo (routes to the owning version). Current-version photos use
  // optimistic local state; other versions rely on the parent's refresh.
  const handleRemovePhoto = useCallback(
    async (photo: TaggedPhoto) => {
      setRemovingPhotoId(photo.id);
      setDeleteConfirmPhoto(null);

      const isCurrent = photo.versionId === currentVersionId;
      if (isCurrent) {
        const currentPhotos = localPhotos ?? version.photos ?? [];
        setLocalPhotos(currentPhotos.filter((p) => p.id !== photo.id));
      }

      const combinedLen =
        (localPhotos ?? version.photos ?? []).length + otherPhotos.length;
      if (activePhotoIndex >= combinedLen - 1) {
        setActivePhotoIndex(Math.max(0, combinedLen - 2));
      }
      if (combinedLen <= 1) {
        handleCloseGallery();
      }

      try {
        await onRemove(photo, photo.versionId);
      } catch {
        if (isCurrent) setLocalPhotos(null);
      } finally {
        setRemovingPhotoId(null);
      }
    },
    [
      localPhotos,
      version.photos,
      otherPhotos.length,
      activePhotoIndex,
      currentVersionId,
      onRemove,
      handleCloseGallery,
    ],
  );

  // Show confirmation for the photo currently open in the gallery.
  const handleRemoveCurrentPhoto = useCallback(() => {
    const photo = galleryPhotos[activePhotoIndex];
    if (photo) {
      setDeleteConfirmPhoto(photo);
    }
  }, [galleryPhotos, activePhotoIndex]);

  // === CAPTION EDITING ===

  const handleStartEditCaption = useCallback((photo: VersionPhoto) => {
    setEditingCaptionId(photo.id);
    setCaptionDraft(photo.caption ?? "");
  }, []);

  const handleSaveCaption = useCallback(
    async (photoId: string) => {
      setEditingCaptionId(null);
      if (onUpdateCaption) {
        await onUpdateCaption(photoId, captionDraft.trim() || null);
      }
    },
    [captionDraft, onUpdateCaption],
  );

  // === THUMBNAIL REORDERING ===

  // Desktop drag and drop reordering
  const handleDragStart = useCallback((e: React.DragEvent, photoId: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedThumbnailId(photoId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, targetPhotoId: string) => {
      e.preventDefault();
      if (!draggedThumbnailId || draggedThumbnailId === targetPhotoId) return;

      const currentOrder = photos.map((p) => p.id);
      const draggedIndex = currentOrder.indexOf(draggedThumbnailId);
      const targetIndex = currentOrder.indexOf(targetPhotoId);

      if (draggedIndex === -1 || targetIndex === -1) return;

      currentOrder.splice(draggedIndex, 1);
      currentOrder.splice(targetIndex, 0, draggedThumbnailId);

      const reorderedPhotos = currentOrder.map((id) => photos.find((p) => p.id === id)!);
      setLocalPhotos(reorderedPhotos);
      onReorder(currentOrder);
      setDraggedThumbnailId(null);
    },
    [draggedThumbnailId, photos, onReorder],
  );

  const handleDragEnd = useCallback(() => {
    setDraggedThumbnailId(null);
  }, []);

  // Mobile touch drag reordering (long-press to start)
  const handleThumbnailTouchStart = useCallback(
    (_e: React.TouchEvent, photoId: string, index: number) => {
      touchStartTimeout.current = setTimeout(() => {
        setTouchDragId(photoId);
        setTouchDragIndex(index);
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 300);
    },
    [],
  );

  const handleThumbnailTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartTimeout.current && !touchDragId) {
        clearTimeout(touchStartTimeout.current);
        touchStartTimeout.current = null;
      }

      if (!touchDragId) return;

      const touch = e.touches[0];

      const entries = Array.from(thumbnailRefs.current.entries());
      for (const [id, element] of entries) {
        const rect = element.getBoundingClientRect();
        if (
          touch.clientX >= rect.left &&
          touch.clientX <= rect.right &&
          touch.clientY >= rect.top &&
          touch.clientY <= rect.bottom
        ) {
          const targetIndex = photos.findIndex((p) => p.id === id);
          if (targetIndex !== -1 && targetIndex !== touchDragIndex) {
            const currentOrder = photos.map((p) => p.id);
            const draggedIndex = currentOrder.indexOf(touchDragId);

            if (draggedIndex !== -1) {
              currentOrder.splice(draggedIndex, 1);
              currentOrder.splice(targetIndex, 0, touchDragId);

              const reorderedPhotos = currentOrder.map(
                (id) => photos.find((p) => p.id === id)!,
              );
              setLocalPhotos(reorderedPhotos);
              setTouchDragIndex(targetIndex);
            }
          }
          break;
        }
      }
    },
    [touchDragId, touchDragIndex, photos],
  );

  const handleThumbnailTouchEnd = useCallback(() => {
    if (touchStartTimeout.current) {
      clearTimeout(touchStartTimeout.current);
      touchStartTimeout.current = null;
    }

    if (touchDragId) {
      const currentOrder = photos.map((p) => p.id);
      onReorder(currentOrder);
      setTouchDragId(null);
      setTouchDragIndex(null);
    }
  }, [touchDragId, photos, onReorder]);

  const currentPhoto = galleryPhotos[activePhotoIndex];

  // === EMPTY STATE ===
  // Only when there are no photos anywhere (current + other versions).
  if (photos.length === 0 && otherPhotos.length === 0 && !isUploading) {
    return (
      <>
        <section
          ref={dropZoneRef}
          className={`rounded-2xl border-2 border-dashed transition-colors p-6 ${
            isDropHovering
              ? "border-blue-400 bg-blue-50"
              : "border-neutral-200 bg-white hover:border-neutral-300"
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDropFile}
        >
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">Snapshots</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Capture your baking progress and results
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium cursor-pointer hover:bg-neutral-800 transition-colors">
                <PlusIcon className="w-3.5 h-3.5" />
                Choose photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 text-xs font-medium cursor-pointer hover:bg-neutral-50 transition-colors md:hidden">
                <CameraIcon className="w-3.5 h-3.5" />
                Take photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-[10px] text-neutral-400">
              or drop an image here &middot; paste from clipboard
            </p>
          </div>

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

        {/* Crop modal */}
        {cropImageUrl && (
          <PhotoCropModal
            imageUrl={cropImageUrl}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </>
    );
  }

  // === MAIN RENDER (has photos) ===

  return (
    <>
      <section
        ref={dropZoneRef}
        className={`rounded-2xl border transition-colors p-4 ${
          isDropHovering ? "border-blue-400 bg-blue-50" : "border-neutral-200 bg-white"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDropFile}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-neutral-800">Snapshots</h3>
            <p className="text-xs text-neutral-500 truncate">
              {photos.length}/{MAX_PHOTOS} photos
            </p>
          </div>

          {/* Horizontally scrollable thumbnail container */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent py-1 max-w-[calc(100%-120px)]">
            {/* Photo thumbnails */}
            {photos
              .filter((p) => p.id !== removingPhotoId)
              .map((photo, index) => (
                <div
                  key={photo.id}
                  ref={(el) => {
                    if (el) thumbnailRefs.current.set(photo.id, el);
                    else thumbnailRefs.current.delete(photo.id);
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, photo.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, photo.id)}
                  onDragEnd={handleDragEnd}
                  onTouchStart={(e) => handleThumbnailTouchStart(e, photo.id, index)}
                  onTouchMove={handleThumbnailTouchMove}
                  onTouchEnd={handleThumbnailTouchEnd}
                  className={`relative group flex-shrink-0 transition-all duration-200 ${
                    draggedThumbnailId === photo.id || touchDragId === photo.id
                      ? "opacity-50 scale-105"
                      : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !touchDragId && handleOpenGallery(index)}
                    className="w-20 aspect-square rounded-lg overflow-hidden border-2 border-neutral-200 hover:border-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                    aria-label={`View photo ${index + 1}`}
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.caption || `Recipe snapshot ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover pointer-events-none"
                    />
                  </button>
                  {/* Drag handle indicator */}
                  <div className="absolute top-1 right-1 p-0.5 rounded bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                    <DragHandleDots2Icon className="w-3 h-3 text-white" />
                  </div>
                </div>
              ))}

            {/* Upload buttons */}
            {canAddMore && (
              <div className="flex-shrink-0 flex gap-1.5">
                {/* File picker button */}
                <label className="w-20 aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] text-neutral-500">
                        {uploadProgress}%
                      </span>
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
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                      e.target.value = "";
                    }}
                    disabled={isUploading}
                  />
                </label>

                {/* Camera capture button (mobile only) */}
                <label className="md:hidden w-20 aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
                  <div className="flex flex-col items-center gap-1">
                    <CameraIcon className="w-5 h-5 text-neutral-400" />
                    <span className="text-[10px] text-neutral-500">Camera</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelected(file);
                      e.target.value = "";
                    }}
                    disabled={isUploading}
                  />
                </label>
              </div>
            )}
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

        {/* Hints */}
        <div className="flex items-center gap-2 mt-2">
          {photos.length > 1 && (
            <p className="text-[10px] text-neutral-400 md:hidden">
              Long-press to reorder
            </p>
          )}
          {canAddMore && (
            <p className="text-[10px] text-neutral-400 hidden md:block">
              Drop or paste images to add
            </p>
          )}
        </div>

        {/* Upload target version selector (multi-version recipes) */}
        {versionOptions && versionOptions.length > 1 && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[11px] text-neutral-500">Add new photos to</span>
            <Select.Root
              value={uploadTargetVersionId}
              onValueChange={setUploadTargetVersionId}
              size="1"
            >
              <Select.Trigger variant="soft" />
              <Select.Content>
                {versionOptions.map((v) => (
                  <Select.Item key={v.id} value={v.id}>
                    {v.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        )}

        {/* Photos from other versions (read-only, tagged) */}
        {otherPhotos.length > 0 && (
          <div className="mt-4 border-t border-neutral-100 pt-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">
              From other versions
            </p>
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {otherPhotos.map((photo, i) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => handleOpenGallery(photos.length + i)}
                  className="relative flex-shrink-0 w-16 aspect-square overflow-hidden rounded-lg border-2 border-neutral-200 transition-colors hover:border-blue-400"
                  aria-label={`View photo from ${photo.versionLabel}`}
                >
                  <img
                    src={photo.photoUrl}
                    alt={photo.caption || photo.versionLabel}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-center text-[9px] leading-tight text-white">
                    {photo.versionLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Crop Modal */}
      {cropImageUrl && (
        <PhotoCropModal
          imageUrl={cropImageUrl}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}

      {/* Photo Gallery Modal */}
      {isGalleryOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center touch-none"
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={scale === 1 ? handleCloseGallery : undefined}
          />

          {/* Navigation arrows (desktop) */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="hidden md:flex absolute left-4 z-20 w-12 h-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Previous photo"
              >
                <ChevronLeftIcon className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={goToNext}
                className="hidden md:flex absolute right-4 z-20 w-12 h-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="Next photo"
              >
                <ChevronRightIcon className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Close & Remove buttons */}
          <div className="absolute top-4 right-4 z-20 flex gap-2">
            <IconButton
              size="2"
              variant="soft"
              color="red"
              onClick={handleRemoveCurrentPhoto}
              disabled={isRemoving}
              aria-label="Remove photo"
            >
              <TrashIcon className="w-4 h-4" />
            </IconButton>
            <button
              onClick={handleCloseGallery}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close gallery"
            >
              <Cross2Icon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Photo counter + version tag */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
            {galleryPhotos.length > 1 && (
              <div className="px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                {activePhotoIndex + 1} / {galleryPhotos.length}
              </div>
            )}
            {currentPhoto?.versionLabel && (
              <div className="px-3 py-1 rounded-full bg-white/15 text-white text-xs font-medium">
                {currentPhoto.versionLabel}
              </div>
            )}
          </div>

          {/* Main image container */}
          <div
            className="relative z-10 w-full flex-1 min-h-0 flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
            onTouchStart={handleGalleryTouchStart}
            onTouchMove={handleGalleryTouchMove}
            onTouchEnd={(e) => {
              handleGalleryTouchEnd(e);
              handleDoubleTap(e);
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            <img
              ref={imageRef}
              src={currentPhoto.photoUrl}
              alt={
                currentPhoto.caption ||
                `Recipe snapshot ${activePhotoIndex + 1} - full size`
              }
              className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
              draggable={false}
            />
          </div>

          {/* Caption area */}
          <div className="relative z-20 w-full max-w-lg px-4 py-3">
            {editingCaptionId === currentPhoto.id ? (
              <input
                autoFocus
                type="text"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                onBlur={() => handleSaveCaption(currentPhoto.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCaption(currentPhoto.id);
                  if (e.key === "Escape") setEditingCaptionId(null);
                  e.stopPropagation();
                }}
                placeholder="Add a caption..."
                maxLength={120}
                className="w-full bg-white/10 text-white text-sm text-center rounded-lg px-3 py-2 placeholder:text-white/40 outline-none focus:bg-white/15 transition-colors"
              />
            ) : (
              <button
                type="button"
                onClick={() => handleStartEditCaption(currentPhoto)}
                className="w-full text-center text-sm py-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {currentPhoto.caption ? (
                  <span className="text-white/80">{currentPhoto.caption}</span>
                ) : (
                  <span className="text-white/30">Tap to add caption</span>
                )}
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {galleryPhotos.length > 1 && (
            <div className="relative z-20 flex gap-2 pb-4">
              {galleryPhotos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setActivePhotoIndex(index);
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
                    setEditingCaptionId(null);
                  }}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === activePhotoIndex
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                  aria-label={`Go to photo ${index + 1}`}
                />
              ))}
            </div>
          )}

          {/* Navigation hint */}
          <div className="absolute bottom-6 right-4 z-20 text-white/60 text-xs hidden md:block">
            {scale > 1 ? `${Math.round(scale * 100)}%` : "Drag to navigate"}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg mx-4">
            <h3 className="text-lg font-semibold text-neutral-900">Delete photo?</h3>
            <p className="mt-2 text-sm text-neutral-600">
              This photo will be permanently deleted. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmPhoto(null)}
                className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemovePhoto(deleteConfirmPhoto)}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
