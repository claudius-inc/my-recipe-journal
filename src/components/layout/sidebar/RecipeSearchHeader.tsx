import { IconButton, TextField, Tooltip } from "@radix-ui/themes";
import { Cross2Icon, MagnifyingGlassIcon } from "@radix-ui/react-icons";

interface RecipeSearchHeaderProps {
  query: string;
  onQueryChange: (query: string) => void;
  isExpanded: boolean;
  onExpandToggle: (expanded: boolean) => void;
  onClose: () => void;
}

export function RecipeSearchHeader({
  query,
  onQueryChange,
  isExpanded,
  onExpandToggle,
  onClose,
}: RecipeSearchHeaderProps) {
  return (
    <div className="flex items-center gap-3 h-9">
      {isExpanded ? (
        <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <TextField.Root
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search recipes..."
            className="flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                if (query) {
                  onQueryChange("");
                } else {
                  onExpandToggle(false);
                }
              }
            }}
          >
            <TextField.Slot>
              <MagnifyingGlassIcon height="16" width="16" />
            </TextField.Slot>
            {query && (
              <TextField.Slot>
                <IconButton
                  size="1"
                  variant="ghost"
                  onClick={() => onQueryChange("")}
                  aria-label="Clear search"
                >
                  <Cross2Icon height="14" width="14" />
                </IconButton>
              </TextField.Slot>
            )}
          </TextField.Root>
          <IconButton
            variant="ghost"
            size="2"
            onClick={() => {
              onQueryChange("");
              onExpandToggle(false);
            }}
            aria-label="Close search"
          >
            <Cross2Icon className="w-4 h-4" />
          </IconButton>
        </div>
      ) : (
        <>
          <h1 className="text-base font-semibold tracking-tight shrink-0 flex-1">
            Recipes
          </h1>
          <Tooltip content="Search (⌘K)">
            <IconButton
              variant="ghost"
              size="2"
              color="gray"
              onClick={() => onExpandToggle(true)}
              aria-label="Search recipes"
            >
              <MagnifyingGlassIcon className="w-4 h-4" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Close">
            <IconButton
              variant="ghost"
              size="2"
              className="rounded-full md:hidden"
              onClick={onClose}
              aria-label="Close recipes panel"
            >
              <Cross2Icon className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        </>
      )}
    </div>
  );
}
