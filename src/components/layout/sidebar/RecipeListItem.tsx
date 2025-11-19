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
  return (
    <li
      className={cn(
        "flex items-stretch transition-all",
        isAnimatingOut && "animate-slideUp",
        isJustMoved &&
          "animate-fadeIn ring-2 ring-blue-400 dark:ring-blue-600 rounded-lg",
      )}
    >
      <Button
        variant={isSelected ? "solid" : "soft"}
        size="3"
        className={cn(
          "flex-1 h-auto rounded-lg rounded-r-none px-4 py-2.5 text-left transition-shadow justify-start",
          isSelected
            ? "shadow-sm"
            : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
          isAnimatingOut && "pointer-events-none opacity-50",
        )}
        onClick={() => onSelect(recipe.id)}
        disabled={isAnimatingOut}
      >
        <div className="space-y-2">
          <div className="flex flex-col gap-2 items-start">
            <div className="flex items-center gap-2">
              {recipe.pinnedAt && (
                <Tooltip content="Pinned">
                  <DrawingPinFilledIcon className="h-4 w-4 text-white" />
                </Tooltip>
              )}
              <span className="text-base font-semibold leading-tight md:text-sm">
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
              className={isSelected ? "bg-white" : ""}
            >
              {formatCategoryLabel(recipe.category)}
            </Badge>
          </div>
          <p
            className={cn(
              "text-xs text-neutral-400 dark:text-neutral-500",
              isSelected && "text-white dark:text-neutral-100 font-medium",
            )}
          >
            Last updated {formatRelativeTime(recipe.updatedAt)}
          </p>
        </div>
      </Button>
      <div className="flex flex-col">
        <IconButton
          variant={isSelected ? "solid" : "soft"}
          size="3"
          color={recipe.pinnedAt ? "blue" : undefined}
          className={cn(
            "rounded-none rounded-tr-lg flex-1",
            isSelected ? "" : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
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
                isSelected ? "" : "bg-neutral-50 hover:shadow-md dark:bg-neutral-900/60",
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
