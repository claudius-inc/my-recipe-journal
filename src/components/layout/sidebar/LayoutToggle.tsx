"use client";

import { IconButton, Tooltip } from "@radix-ui/themes";
import {
  RowsIcon,
  DashboardIcon,
  ListBulletIcon,
  TextIcon,
  ViewGridIcon,
} from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";
import type { SidebarLayout } from "./RecipeListItemLayouts";

interface LayoutToggleProps {
  layout: SidebarLayout;
  onLayoutChange: (layout: SidebarLayout) => void;
}

const layouts: { id: SidebarLayout; icon: React.ReactNode; label: string }[] = [
  { id: "default", icon: <RowsIcon />, label: "Default" },
  { id: "compact", icon: <DashboardIcon />, label: "Compact" },
  { id: "list", icon: <ListBulletIcon />, label: "List" },
  { id: "cards", icon: <ViewGridIcon />, label: "Cards" },
  { id: "minimal", icon: <TextIcon />, label: "Minimal" },
];

export function LayoutToggle({ layout, onLayoutChange }: LayoutToggleProps) {
  return (
    <div className="flex items-center gap-0.5 p-1 bg-neutral-100 rounded-md">
      {layouts.map((l) => (
        <Tooltip key={l.id} content={l.label}>
          <IconButton
            variant="ghost"
            size="1"
            className={cn(
              "transition-colors",
              layout === l.id ? "bg-white shadow-sm" : "hover:bg-neutral-200",
            )}
            onClick={() => onLayoutChange(l.id)}
            aria-label={l.label}
          >
            {l.icon}
          </IconButton>
        </Tooltip>
      ))}
    </div>
  );
}
