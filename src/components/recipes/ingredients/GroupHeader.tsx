"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, DragHandleDots2Icon } from "@radix-ui/react-icons";
import { Switch, Text, Flex } from "@radix-ui/themes";
import { cn } from "@/lib/utils";
import type { IngredientGroup } from "@/types/recipes";

interface GroupHeaderProps {
  group: IngredientGroup;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateGroup: (data: Partial<IngredientGroup>) => Promise<void>;
  onDeleteGroup: () => void;
  canDelete: boolean;
  isBakingCategory: boolean;
  // Check all props
  showCheckAll?: boolean;
  allChecked?: boolean;
  onToggleAllIngredients?: () => void;
}

export function GroupHeader({
  group,
  isCollapsed,
  onToggleCollapse,
  onUpdateGroup,
  onDeleteGroup,
  canDelete,
  isBakingCategory,
  showCheckAll = false,
  allChecked = false,
  onToggleAllIngredients,
}: GroupHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group.name);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!isEditingName) {
      setEditedName(group.name);
    }
  }, [group.name, isEditingName]);

  const handleSaveName = () => {
    const trimmedName = editedName.trim();
    setIsEditingName(false);

    if (trimmedName && trimmedName !== group.name) {
      onUpdateGroup({ name: trimmedName }).catch((error) => {
        console.error("Failed to save group name:", error);
      });
    }
  };

  const handleToggleBakersPercent = async () => {
    try {
      await onUpdateGroup({ enableBakersPercent: !group.enableBakersPercent });
    } catch (error) {
      console.error("Failed to toggle baker's percentage:", error);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-neutral-50 px-4 py-3">
      {/* Drag Handle */}
      <button
        type="button"
        className="cursor-grab text-neutral-400 transition hover:text-neutral-600 active:cursor-grabbing"
        aria-label="Drag to reorder group"
      >
        <DragHandleDots2Icon className="h-4 w-4" />
      </button>

      {/* Collapse/Expand Button */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-neutral-400 transition-transform duration-200 hover:bg-neutral-100",
          isCollapsed ? "" : "rotate-180",
        )}
        aria-label={isCollapsed ? "Expand group" : "Collapse group"}
      >
        <ChevronDownIcon className="h-4 w-4" />
      </button>

      {/* Group Name */}
      <div className="flex-1 min-w-0">
        {isEditingName ? (
          <input
            autoFocus
            type="text"
            value={editedName}
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveName();
              } else if (e.key === "Escape") {
                setEditedName(group.name);
                setIsEditingName(false);
              }
            }}
            className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm font-medium text-neutral-900 outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsEditingName(true)}
            className="text-sm font-medium text-neutral-900 hover:text-neutral-700 truncate"
          >
            {group.name} ({group.ingredients.length})
          </button>
        )}
      </div>

      {/* Check All Button */}
      {showCheckAll && onToggleAllIngredients && !isCollapsed && (
        <button
          type="button"
          onClick={onToggleAllIngredients}
          className="text-xs text-blue-600 hover:underline flex-shrink-0"
        >
          {allChecked ? "Uncheck" : "Check all"}
        </button>
      )}

      {/* Baker's Percentage Toggle (only for baking categories, hidden on mobile) */}
      {isBakingCategory && (
        <Flex gap="2" align="center" className="hidden md:flex flex-shrink-0">
          <Text size="2" weight="medium" className="text-neutral-700">
            %
          </Text>
          <Switch
            size="1"
            checked={group.enableBakersPercent}
            onCheckedChange={handleToggleBakersPercent}
            aria-label="Toggle baker's percentage"
          />
        </Flex>
      )}

      {/* Menu Button */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Group options"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {/* Dropdown Menu - z-30 to be above sticky header (z-10) */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
            {/* Menu */}
            <div className="absolute right-0 top-full z-30 mt-1 w-40 rounded-lg border border-neutral-200 bg-white shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(true);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-50"
              >
                Rename
              </button>
              {/* Baker's Percentage Toggle (mobile only) */}
              {isBakingCategory && (
                <div className="w-full px-4 py-2 md:hidden">
                  <Flex gap="2" align="center" justify="between">
                    <Text size="2" className="text-neutral-700">
                      Baker&apos;s %
                    </Text>
                    <Switch
                      size="1"
                      checked={group.enableBakersPercent}
                      onCheckedChange={() => {
                        handleToggleBakersPercent();
                        setShowMenu(false);
                      }}
                      aria-label="Toggle baker's percentage"
                    />
                  </Flex>
                </div>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (
                      group.ingredients.length === 0 ||
                      confirm(
                        `Delete "${group.name}" group with ${group.ingredients.length} ingredient(s)?`,
                      )
                    ) {
                      onDeleteGroup();
                    }
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
