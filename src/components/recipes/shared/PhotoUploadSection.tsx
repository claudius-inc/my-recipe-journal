import { useState, useCallback, useRef, useMemo } from "react";
import type { RecipeVersion, VersionPhoto } from "@/types/recipes";
import { IconButton } from "@radix-ui/themes";
import {
  Cross2Icon,
  PlusIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
} from "@radix-ui/react-icons";
import { UploadProgress } from "@/components/ui/UploadProgress";

export interface PhotoSectionProps {
  version: RecipeVersion;
  onUpload: (file: File) => Promise<void>;
  onRemove: (photo: VersionPhoto) => Promise<void>;
  onReorder: (photoIds: string[]) => Promise<void>;
  isUploading: boolean;
  uploadProgress?: number;
  uploadError?: string;
  isRemoving?: boolean;
}

const MAX_PHOTOS = 10;

export function PhotoUploadSection({
  version,
  onUpload,
  onRemove,
  onReorder,
  isUploading,
  uploadProgress = 0,
  uploadError,
  isRemoving = false,
}: PhotoSectionProps) {
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
  const [deleteConfirmPhoto, setDeleteConfirmPhoto] = useState<VersionPhoto | null>(null);

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

  // Use local photos if set (optimistic), otherwise use version.photos
  const photos = useMemo(
    () => localPhotos ?? version.photos ?? [],
    [localPhotos, version.photos],
  );
  const canAddMore = photos.length < MAX_PHOTOS;

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

  // Open gallery at specific photo
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
  }, []);

  // Navigate to prev/next photo
  const goToPrev = useCallback(() => {
    setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [photos.length]);

  const goToNext = useCallback(() => {
    setActivePhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [photos.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") handleCloseGallery();
      else if (e.key === "ArrowLeft") goToPrev();
      else if (e.key === "ArrowRight") goToNext();
    },
    [handleCloseGallery, goToPrev, goToNext],
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
    (e: React.TouchEvent) => {
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

  // Remove photo with optimistic UI
  const handleRemovePhoto = useCallback(async (photo: VersionPhoto) => {
    setRemovingPhotoId(photo.id);
    setDeleteConfirmPhoto(null);
    
    // Optimistically remove from local state
    const currentPhotos = localPhotos ?? version.photos ?? [];
    const updatedPhotos = currentPhotos.filter((p) => p.id !== photo.id);
    setLocalPhotos(updatedPhotos);
    
    // Adjust active index if needed
    const photoIndex = currentPhotos.findIndex((p) => p.id === photo.id);
    if (activePhotoIndex >= updatedPhotos.length) {
      setActivePhotoIndex(Math.max(0, updatedPhotos.length - 1));
    } else if (photoIndex < activePhotoIndex) {
      setActivePhotoIndex(activePhotoIndex - 1);
    }
    
    // Close gallery if no photos left
    if (updatedPhotos.length === 0) {
      handleCloseGallery();
    }
    
    try {
      await onRemove(photo);
    } catch (error) {
      // Revert optimistic update on error
      setLocalPhotos(null);
    } finally {
      setRemovingPhotoId(null);
    }
  }, [localPhotos, version.photos, activePhotoIndex, onRemove, handleCloseGallery]);

  // Show confirmation for current photo
  const handleRemoveCurrentPhoto = useCallback(() => {
    const currentPhoto = photos[activePhotoIndex];
    if (currentPhoto) {
      setDeleteConfirmPhoto(currentPhoto);
    }
  }, [photos, activePhotoIndex]);

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
    (e: React.TouchEvent, photoId: string, index: number) => {
      // Long press to initiate drag
      touchStartTimeout.current = setTimeout(() => {
        setTouchDragId(photoId);
        setTouchDragIndex(index);
        // Vibrate for feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 300);
    },
    [],
  );

  const handleThumbnailTouchMove = useCallback(
    (e: React.TouchEvent) => {
      // Cancel long-press if moved before timeout
      if (touchStartTimeout.current && !touchDragId) {
        clearTimeout(touchStartTimeout.current);
        touchStartTimeout.current = null;
      }

      if (!touchDragId) return;

      const touch = e.touches[0];

      // Find which thumbnail we're over
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
            // Swap positions optimistically
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
      // Commit the reorder to server
      const currentOrder = photos.map((p) => p.id);
      onReorder(currentOrder);
      setTouchDragId(null);
      setTouchDragIndex(null);
    }
  }, [touchDragId, photos, onReorder]);

  const currentPhoto = photos[activePhotoIndex];

  return (
    <>
      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
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
            {photos.filter((p) => p.id !== removingPhotoId).map((photo, index) => (
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
                    alt={`Recipe snapshot ${index + 1}`}
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

            {/* Upload button */}
            {canAddMore && (
              <label className="flex-shrink-0 w-20 aspect-square flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors">
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
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onUpload(file);
                    }
                    event.target.value = "";
                  }}
                  disabled={isUploading}
                />
              </label>
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

        {/* Touch drag hint */}
        {photos.length > 1 && (
          <p className="text-[10px] text-neutral-400 mt-2 md:hidden">
            Long-press to reorder photos
          </p>
        )}
      </section>

      {/* Photo Gallery Modal */}
      {isGalleryOpen && currentPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          className="fixed inset-0 z-50 flex items-center justify-center touch-none"
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
            {/* Plain white close button */}
            <button
              onClick={handleCloseGallery}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              aria-label="Close gallery"
            >
              <Cross2Icon className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Photo counter */}
          {photos.length > 1 && (
            <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
              {activePhotoIndex + 1} / {photos.length}
            </div>
          )}

          {/* Main image container with mouse/touch support */}
          <div
            className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
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
              alt={`Recipe snapshot ${activePhotoIndex + 1} - full size`}
              className="max-w-full max-h-full object-contain select-none transition-transform duration-100"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
              draggable={false}
            />
          </div>

          {/* Dot indicators */}
          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => {
                    setActivePhotoIndex(index);
                    setScale(1);
                    setPosition({ x: 0, y: 0 });
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
