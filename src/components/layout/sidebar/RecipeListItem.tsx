import { Badge, Button, DropdownMenu, IconButton, Tooltip } from "@radix-ui/themes";
import {
  ArchiveIcon,
  DotsVerticalIcon,
  DrawingPinFilledIcon,
  DrawingPinIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/formatting";
import { formatCategoryLabel, type Recipe } from "@/types/recipes";
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
  // Determine the active version to show its image
  const activeVersion =
    recipe.versions.find((v) => v.id === recipe.activeVersionId) ||
    recipe.versions[recipe.versions.length - 1]; // Fallback to last version if active not found (shouldn't happen)

  // Get the primary photo (first in list) or legacy photoUrl
  const displayImage = activeVersion?.photos?.[0]?.photoUrl || activeVersion?.photoUrl;

  return (
    <li
      className={cn(
        "flex items-stretch transition-all",
        isAnimatingOut && "animate-slideUp",
        isJustMoved && "animate-fadeIn ring-2 ring-blue-400 rounded-lg",
      )}
    >
      <Button
        variant={isSelected ? "solid" : "soft"}
        size="3"
        className={cn(
          "flex-1 h-auto rounded-lg rounded-r-none px-4 py-2.5 text-left justify-start min-w-0 overflow-hidden",
          isSelected ? "" : "bg-neutral-50",
          isAnimatingOut && "pointer-events-none opacity-50",
        )}
        onClick={() => onSelect(recipe.id)}
        disabled={isAnimatingOut}
      >
        <div className="space-y-2 min-w-0">
          <div className="flex flex-col gap-2 items-start min-w-0 w-full">
            <div className="flex flex-row gap-3 items-center w-full min-w-0">
              {/* Thumbnail Image */}
              <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-black/5 overflow-hidden border border-black/5">
                {displayImage ? (
                  <Image
                    src={displayImage}
                    alt={recipe.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-primary-50 to-primary-100 opacity-70">
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 via-primary-100 to-primary-100">
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                        {/* Cookie edge - bumpy circle */}
                        {Array.from({ length: 16 }).map((_, i) => {
                          const angle = (i / 16) * Math.PI * 2;
                          const wobble = Math.sin(i * 3) * 1.5;
                          const x = 16 + Math.cos(angle) * (10 + wobble);
                          const y = 16 + Math.sin(angle) * (10 + wobble);
                          return (
                            <circle
                              key={`edge-${i}`}
                              cx={x}
                              cy={y}
                              r={1.8}
                              fill="#d97706"
                              opacity={0.6}
                            />
                          );
                        })}
                        {/* Chocolate chips */}
                        {[
                          [12, 12],
                          [18, 10],
                          [14, 18],
                          [20, 16],
                          [16, 14],
                          [10, 16],
                          [18, 20],
                        ].map(([x, y], i) => (
                          <circle
                            key={`chip-${i}`}
                            cx={x}
                            cy={y}
                            r={1.5}
                            fill="#451a03"
                            opacity={0.9}
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Text, Pins, Badges */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {recipe.pinnedAt && (
                    <Tooltip content="Pinned">
                      <DrawingPinFilledIcon className="h-4 w-4 text-white" />
                    </Tooltip>
                  )}
                  <span className="text-sm font-semibold leading-tight truncate">
                    {recipe.name}
                  </span>
                  {recipe.archivedAt && (
                    <Tooltip content="Archived">
                      <ArchiveIcon className="h-4 w-4 text-orange-500" />
                    </Tooltip>
                  )}
                </div>
                <Badge
                  color={isSelected ? "gray" : "gold"}
                  variant="soft"
                  className={`self-start ${isSelected ? "bg-white" : ""}`}
                >
                  {formatCategoryLabel(recipe.category)}
                </Badge>
              </div>
            </div>
          </div>
          <p className={cn("text-xs text-neutral-400 mt-1", isSelected && "text-white")}>
            Last updated {formatRelativeTime(recipe.updatedAt)}
          </p>
        </div>
      </Button>
      <div className="flex flex-col shrink-0">
        <IconButton
          variant={isSelected ? "solid" : "soft"}
          size="3"
          color={recipe.pinnedAt ? "blue" : undefined}
          className={cn(
            "rounded-none rounded-tr-lg flex-1",
            isSelected ? "" : "bg-neutral-50",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(recipe.id, !!recipe.pinnedAt);
          }}
          disabled={isAnimatingOut || isArchiveInProgress || isPinInProgress}
          aria-label={recipe.pinnedAt ? "Unpin recipe" : "Pin recipe"}
        >
          {recipe.pinnedAt ? <DrawingPinFilledIcon /> : <DrawingPinIcon />}
        </IconButton>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant={isSelected ? "solid" : "soft"}
              size="3"
              className={cn(
                "rounded-none rounded-br-lg flex-1",
                isSelected ? "" : "bg-neutral-50",
              )}
              aria-label="Recipe options"
              disabled={isAnimatingOut || isArchiveInProgress}
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
              <ArchiveIcon />
              {recipe.archivedAt ? "Unarchive" : "Archive"}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </li>
  );
}
