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

export type SidebarLayout = "default" | "compact" | "list" | "cards" | "minimal";

interface RecipeListItemLayoutProps {
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
  layout: SidebarLayout;
}

// Shared helper to get display image
function getDisplayImage(recipe: Recipe) {
  const activeVersion =
    recipe.versions.find((v) => v.id === recipe.activeVersionId) ||
    recipe.versions[recipe.versions.length - 1];
  return activeVersion?.photos?.[0]?.photoUrl || activeVersion?.photoUrl;
}

// Cookie placeholder SVG
function CookiePlaceholder({ size = 32 }: { size?: number }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 via-primary-50 to-primary-100 opacity-70">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
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

// Actions dropdown (shared)
function ActionsDropdown({
  recipe,
  isSelected,
  onToggleArchive,
  onDuplicate,
  isAnimatingOut,
  isArchiveInProgress,
}: {
  recipe: Recipe;
  isSelected: boolean;
  onToggleArchive: (id: string, isArchived: boolean) => void;
  onDuplicate: (recipe: Recipe) => void;
  isAnimatingOut?: boolean;
  isArchiveInProgress?: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <IconButton
          variant="ghost"
          size="1"
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Recipe options"
          disabled={isAnimatingOut || isArchiveInProgress}
        >
          <DotsVerticalIcon />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={() => onDuplicate(recipe)} disabled={isAnimatingOut}>
          Duplicate
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item
          onClick={() => onToggleArchive(recipe.id, !!recipe.archivedAt)}
          disabled={isAnimatingOut || isArchiveInProgress}
        >
          <ArchiveIcon />
          {recipe.archivedAt ? "Unarchive" : "Archive"}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

// =============================================================================
// LAYOUT 1: COMPACT — Small thumbnails, single line
// =============================================================================
function CompactLayout(props: RecipeListItemLayoutProps) {
  const { recipe, isSelected, onSelect, onTogglePin, isAnimatingOut, isPinInProgress } = props;
  const displayImage = getDisplayImage(recipe);

  return (
    <li
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
        isSelected ? "bg-primary-100" : "hover:bg-neutral-100",
        isAnimatingOut && "opacity-50 pointer-events-none",
      )}
      onClick={() => onSelect(recipe.id)}
    >
      {/* Small thumbnail */}
      <div className="relative flex-shrink-0 w-8 h-8 rounded overflow-hidden bg-black/5">
        {displayImage ? (
          <Image src={displayImage} alt="" fill className="object-cover" sizes="32px" />
        ) : (
          <CookiePlaceholder size={20} />
        )}
      </div>

      {/* Name */}
      <span className="flex-1 text-sm truncate">{recipe.name}</span>

      {/* Pin indicator */}
      {recipe.pinnedAt && <DrawingPinFilledIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />}

      {/* Pin action on hover */}
      <IconButton
        variant="ghost"
        size="1"
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin(recipe.id, !!recipe.pinnedAt);
        }}
        disabled={isAnimatingOut || isPinInProgress}
      >
        {recipe.pinnedAt ? <DrawingPinFilledIcon /> : <DrawingPinIcon />}
      </IconButton>
    </li>
  );
}

// =============================================================================
// LAYOUT 2: LIST — Text only with category dot
// =============================================================================
function ListLayout(props: RecipeListItemLayoutProps) {
  const { recipe, isSelected, onSelect, onTogglePin, onToggleArchive, onDuplicate, isAnimatingOut, isPinInProgress, isArchiveInProgress } = props;

  const primaryColors: Record<string, string> = {
    baked: "bg-amber-400",
    dessert: "bg-pink-400",
    savory: "bg-green-400",
    drink: "bg-blue-400",
    preserve: "bg-orange-400",
    other: "bg-gray-400",
  };

  const categoryPrimary = typeof recipe.category === "object" ? recipe.category.primary : "other";

  return (
    <li
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors",
        isSelected ? "bg-primary-100" : "hover:bg-neutral-100",
        isAnimatingOut && "opacity-50 pointer-events-none",
      )}
      onClick={() => onSelect(recipe.id)}
    >
      {/* Category dot */}
      <div
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          primaryColors[categoryPrimary] || "bg-gray-400",
        )}
      />

      {/* Name + timestamp */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{recipe.name}</span>
          {recipe.pinnedAt && <DrawingPinFilledIcon className="h-3 w-3 text-blue-500" />}
        </div>
        <span className="text-xs text-neutral-400">{formatRelativeTime(recipe.updatedAt)}</span>
      </div>

      {/* Actions */}
      <ActionsDropdown
        recipe={recipe}
        isSelected={isSelected}
        onToggleArchive={onToggleArchive}
        onDuplicate={onDuplicate}
        isAnimatingOut={isAnimatingOut}
        isArchiveInProgress={isArchiveInProgress}
      />
    </li>
  );
}

// =============================================================================
// LAYOUT 3: CARDS — Larger thumbnails, vertical
// =============================================================================
function CardsLayout(props: RecipeListItemLayoutProps) {
  const { recipe, isSelected, onSelect, onTogglePin, onToggleArchive, onDuplicate, isAnimatingOut, isPinInProgress, isArchiveInProgress } = props;
  const displayImage = getDisplayImage(recipe);

  return (
    <li
      className={cn(
        "group rounded-lg overflow-hidden cursor-pointer transition-all border",
        isSelected ? "border-primary-300 bg-primary-50" : "border-transparent hover:border-neutral-200 bg-white",
        isAnimatingOut && "opacity-50 pointer-events-none",
      )}
      onClick={() => onSelect(recipe.id)}
    >
      {/* Large thumbnail */}
      <div className="relative w-full aspect-[4/3] bg-neutral-100">
        {displayImage ? (
          <Image src={displayImage} alt={recipe.name} fill className="object-cover" sizes="200px" />
        ) : (
          <CookiePlaceholder size={48} />
        )}
        {/* Pin overlay */}
        {recipe.pinnedAt && (
          <div className="absolute top-2 right-2 bg-white/90 rounded-full p-1">
            <DrawingPinFilledIcon className="h-3 w-3 text-blue-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="text-sm font-semibold truncate">{recipe.name}</h4>
            <Badge color="gold" variant="soft" size="1" className="mt-1">
              {formatCategoryLabel(recipe.category)}
            </Badge>
          </div>
          <ActionsDropdown
            recipe={recipe}
            isSelected={isSelected}
            onToggleArchive={onToggleArchive}
            onDuplicate={onDuplicate}
            isAnimatingOut={isAnimatingOut}
            isArchiveInProgress={isArchiveInProgress}
          />
        </div>
      </div>
    </li>
  );
}

// =============================================================================
// LAYOUT 4: MINIMAL — Clean text only, no images
// =============================================================================
function MinimalLayout(props: RecipeListItemLayoutProps) {
  const { recipe, isSelected, onSelect, onTogglePin, isAnimatingOut, isPinInProgress } = props;

  return (
    <li
      className={cn(
        "group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
        isSelected ? "bg-primary-100 rounded-md" : "hover:bg-neutral-50",
        isAnimatingOut && "opacity-50 pointer-events-none",
      )}
      onClick={() => onSelect(recipe.id)}
    >
      <span className={cn("text-sm", isSelected && "font-medium")}>{recipe.name}</span>

      <div className="flex items-center gap-1">
        {recipe.pinnedAt && <DrawingPinFilledIcon className="h-3 w-3 text-blue-500" />}
        <span className="text-xs text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity">
          {formatCategoryLabel(recipe.category)}
        </span>
      </div>
    </li>
  );
}

// =============================================================================
// LAYOUT 5: DEFAULT — Original layout (current)
// =============================================================================
function DefaultLayout(props: RecipeListItemLayoutProps) {
  const { recipe, isSelected, onSelect, onTogglePin, onToggleArchive, onDuplicate, isAnimatingOut, isJustMoved, isArchiveInProgress, isPinInProgress } = props;
  const displayImage = getDisplayImage(recipe);

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
                  <Image src={displayImage} alt={recipe.name} fill className="object-cover" sizes="48px" />
                ) : (
                  <CookiePlaceholder size={32} />
                )}
              </div>

              {/* Text */}
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  {recipe.pinnedAt && (
                    <Tooltip content="Pinned">
                      <DrawingPinFilledIcon className="h-4 w-4 text-white" />
                    </Tooltip>
                  )}
                  <span className="text-sm font-semibold leading-tight truncate">{recipe.name}</span>
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
          className={cn("rounded-none rounded-tr-lg flex-1", isSelected ? "" : "bg-neutral-50")}
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
              className={cn("rounded-none rounded-br-lg flex-1", isSelected ? "" : "bg-neutral-50")}
              aria-label="Recipe options"
              disabled={isAnimatingOut || isArchiveInProgress}
            >
              <DotsVerticalIcon />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => onDuplicate(recipe)} disabled={isAnimatingOut}>
              Duplicate
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onClick={() => onToggleArchive(recipe.id, !!recipe.archivedAt)}
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

// =============================================================================
// MAIN EXPORT
// =============================================================================
export function RecipeListItemWithLayout(props: RecipeListItemLayoutProps) {
  switch (props.layout) {
    case "compact":
      return <CompactLayout {...props} />;
    case "list":
      return <ListLayout {...props} />;
    case "cards":
      return <CardsLayout {...props} />;
    case "minimal":
      return <MinimalLayout {...props} />;
    case "default":
    default:
      return <DefaultLayout {...props} />;
  }
}
