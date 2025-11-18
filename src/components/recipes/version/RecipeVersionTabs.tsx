"use client";

import { useState } from "react";
import type { Recipe, RecipeVersion } from "@/types/recipes";
import { Button, DropdownMenu, IconButton, Tooltip } from "@radix-ui/themes";
import { PlusIcon } from "@radix-ui/react-icons";
import { formatDate } from "@/lib/formatting";

export interface VersionTabsProps {
  recipe: Recipe;
  activeVersion: RecipeVersion;
  onSelect: (recipeId: string, versionId: string) => Promise<void>;
  onDuplicate: () => Promise<void>;
  onDelete: (versionId: string) => Promise<void>;
  onCompare: (versionId: string) => void;
}

export function RecipeVersionTabs({
  recipe,
  activeVersion,
  onSelect,
  onDuplicate,
  onDelete,
  onCompare,
}: VersionTabsProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSelectingVersion, setIsSelectingVersion] = useState<string | null>(null);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 relative">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {recipe.versions
            .sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
            )
            .map((version, index) => {
              const isActive = version.id === activeVersion.id;
              const isLoading = isSelectingVersion === version.id;
              const versionNumber = index + 1;
              const isDeletingThis = isDeleting === version.id;
              const otherVersions = recipe.versions.filter((v) => v.id !== version.id);

              return (
                <DropdownMenu.Root key={version.id}>
                  <DropdownMenu.Trigger>
                    <Button
                      size="2"
                      loading={isLoading}
                      variant={isActive ? "solid" : "outline"}
                      className="h-12"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col text-left">
                          <span className="font-bold">Ver. {versionNumber}</span>
                          <span className="text-xs font-normal">
                            {formatDate(version.createdAt)}
                          </span>
                        </div>
                      </div>
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Item
                      onClick={async () => {
                        setIsSelectingVersion(version.id);
                        try {
                          await onSelect(recipe.id, version.id);
                        } finally {
                          setIsSelectingVersion(null);
                        }
                      }}
                      disabled={isActive}
                    >
                      {isActive ? "Current" : "Switch to This Version"}
                    </DropdownMenu.Item>
                    {otherVersions.length > 0 && (
                      <DropdownMenu.Sub>
                        <DropdownMenu.SubTrigger>Compare with...</DropdownMenu.SubTrigger>
                        <DropdownMenu.SubContent>
                          {otherVersions.map((otherVersion) => {
                            const otherVersionNumber =
                              recipe.versions
                                .sort(
                                  (a, b) =>
                                    new Date(a.createdAt).getTime() -
                                    new Date(b.createdAt).getTime(),
                                )
                                .findIndex((v) => v.id === otherVersion.id) + 1;
                            return (
                              <DropdownMenu.Item
                                key={otherVersion.id}
                                onClick={() => onCompare(otherVersion.id)}
                              >
                                Ver. {otherVersionNumber} (
                                {formatDate(otherVersion.createdAt)})
                              </DropdownMenu.Item>
                            );
                          })}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Sub>
                    )}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Item
                      color="red"
                      onClick={async () => {
                        setIsDeleting(version.id);
                        try {
                          await onDelete(version.id);
                        } finally {
                          setIsDeleting(null);
                        }
                      }}
                      disabled={recipe.versions.length === 1 || isDeletingThis}
                    >
                      {isDeletingThis ? "Deleting..." : "Delete Version"}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              );
            })}
        </div>
      </div>
      <div className="absolute top-0 right-0 -translate-y-2 translate-x-2">
        <Tooltip content="Create new version">
          <IconButton
            onClick={onDuplicate}
            variant="surface"
            size="2"
            aria-label="Create new version"
          >
            <PlusIcon className="w-4 h-4" />
          </IconButton>
        </Tooltip>
      </div>
    </section>
  );
}
