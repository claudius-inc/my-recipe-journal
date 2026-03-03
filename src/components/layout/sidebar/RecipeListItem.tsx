import { DropdownMenu, IconButton } from "@radix-ui/themes";
import {
  ArchiveIcon,
  DotsVerticalIcon,
  DrawingPinFilledIcon,
  DrawingPinIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types/recipes";
import Image from "next/image";

interface RecipeListItemProps {
  recipe: Recipe;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onDuplicate: (recipe: Recipe) => void;
  isAnimatingOut?: boolean;
  isJustMoved?: boolean;
  isArchiveInProgress?: boolean;
  isPinInProgress?: boolean;
}

function getDisplayImage(recipe: Recipe) {
  const activeVersion =
    recipe.versions.find((v) => v.id === recipe.activeVersionId) ||
    recipe.versions[recipe.versions.length - 1];
  return activeVersion?.photos?.[0]?.photoUrl || activeVersion?.photoUrl;
}

function CookiePlaceholder() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-primary-50 to-primary-100 opacity-70">
      <svg width={20} height={20} viewBox="0 0 32 32" fill="none">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const wobble = Math.sin(i * 3) * 1.5;
          const x = 16 + Math.cos(angle) * (10 + wobble);
          const y = 16 + Math.sin(angle) * (10 + wobble);
          return <circle key={`edge-${i}`} cx={x} cy={y} r={1.8} fill="#d97706" opacity={0.6} />;
        })}
        {[[12, 12], [18, 10], [14, 18], [20, 16], [16, 14], [10, 16], [18, 20]].map(([x, y], i) => (
          <circle key={`chip-${i}`} cx={x} cy={y} r={1.5} fill="#451a03" opacity={0.9} />
        ))}
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
  onDuplicate,
  isAnimatingOut,
  isJustMoved,
  isArchiveInProgress,
  isPinInProgress,
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
          <Image src={displayImage} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <CookiePlaceholder />
        )}
      </div>

      {/* Name + Pin indicator */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className={cn("text-sm truncate", isSelected && "font-medium")}>
          {recipe.name}
        </span>
        {recipe.pinnedAt && (
          <DrawingPinFilledIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
        )}
        {recipe.archivedAt && (
          <ArchiveIcon className="h-3 w-3 text-orange-500 flex-shrink-0" />
        )}
      </div>

      {/* Actions - always visible on mobile, hover on desktop */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Pin button - always visible on mobile for easy access */}
        <IconButton
          variant="ghost"
          size="1"
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
              size="1"
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
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
