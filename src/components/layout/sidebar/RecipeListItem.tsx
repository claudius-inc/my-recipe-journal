import { DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  ArchiveIcon,
  DotsVerticalIcon,
  DrawingPinFilledIcon,
  DrawingPinIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { SECONDARY_LABELS, type Recipe } from "@/types/recipes";
import Image from "next/image";

interface RecipeListItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onDelete: (id: string) => void;
  onDuplicate: (recipe: Recipe) => void;
  isAnimatingOut?: boolean;
  isJustMoved?: boolean;
  isArchiveInProgress?: boolean;
  isPinInProgress?: boolean;
  isDeleteInProgress?: boolean;
}

function getDisplayImage(recipe: Recipe) {
  const activeVersion =
    recipe.versions.find((v) => v.id === recipe.activeVersionId) ||
    recipe.versions[recipe.versions.length - 1];
  return activeVersion?.photos?.[0]?.photoUrl || activeVersion?.photoUrl;
}

// Neutral "no photo" placeholder — deliberately unlike a real food photo so
// it's obvious at a glance which recipes have a picture and which don't.
function PhotoPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-neutral-300">
      <svg
        width={18}
        height={18}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    </div>
  );
}

export function RecipeListItem({
  recipe,
  isSelected,
  onSelect,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onDuplicate,
  isAnimatingOut,
  isJustMoved,
  isArchiveInProgress,
  isPinInProgress,
  isDeleteInProgress,
}: RecipeListItemProps) {
  const displayImage = getDisplayImage(recipe);

  return (
    <li
      className={cn(
        "group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-primary-100" : "hover:bg-neutral-100",
        isAnimatingOut && "opacity-50 pointer-events-none",
        isJustMoved && "ring-2 ring-blue-400",
      )}
      onClick={() => onSelect(recipe.id)}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-black/5">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={`${recipe.name} photo`}
            fill
            className="object-cover"
            sizes="40px"
          />
        ) : (
          <PhotoPlaceholder />
        )}
      </div>

      {/* Name + meta */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("truncate text-sm", isSelected && "font-medium")}>
            {recipe.name}
          </span>
          {recipe.archivedAt && (
            <ArchiveIcon className="h-3 w-3 flex-shrink-0 text-orange-500" />
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-neutral-400">
          <span className="flex-shrink-0">
            {SECONDARY_LABELS[recipe.category.secondary] ?? ""}
          </span>
          {recipe.tags && recipe.tags.length > 0 && (
            <span className="truncate">
              · {recipe.tags.slice(0, 2).join(", ")}
              {recipe.tags.length > 2 ? ` +${recipe.tags.length - 2}` : ""}
            </span>
          )}
        </div>
      </div>

      {/* Actions - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Pin button - always visible on mobile for easy access */}
        <IconButton
          variant="ghost"
          size="2"
          color={recipe.pinnedAt ? "blue" : undefined}
          className={cn(
            "transition-opacity",
            // Always visible on mobile (touch), hover on desktop
            "opacity-100 md:opacity-0 md:group-hover:opacity-100",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(recipe.id, !!recipe.pinnedAt);
          }}
          disabled={isAnimatingOut || isPinInProgress}
          aria-label={recipe.pinnedAt ? "Unpin recipe" : "Pin recipe"}
        >
          {recipe.pinnedAt ? <DrawingPinFilledIcon /> : <DrawingPinIcon />}
        </IconButton>

        {/* Menu button */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant="ghost"
              size="2"
              className={cn(
                "transition-opacity",
                "opacity-100 md:opacity-0 md:group-hover:opacity-100",
              )}
              aria-label="Recipe options"
              disabled={isAnimatingOut || isArchiveInProgress}
              onClick={(e) => e.stopPropagation()}
            >
              <DotsVerticalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(recipe);
              }}
              disabled={isAnimatingOut}
            >
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={(e) => {
                e.stopPropagation();
                onToggleArchive(recipe.id, !!recipe.archivedAt);
              }}
              disabled={isAnimatingOut || isArchiveInProgress}
            >
              <ArchiveIcon className="mr-2" />
              {recipe.archivedAt ? "Unarchive" : "Archive"}
            </DropdownMenu.Item>
            {recipe.archivedAt && (
              <DropdownMenu.Item
                color="red"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(recipe.id);
                }}
                disabled={isAnimatingOut || isDeleteInProgress}
              >
                <TrashIcon className="mr-2" />
                Delete permanently
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
