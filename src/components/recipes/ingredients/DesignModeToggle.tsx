"use client";

import { cn } from "@/lib/utils";
import { 
  useIngredientDesign, 
  DESIGN_MODE_LABELS, 
  IngredientDesignMode 
} from "./IngredientDesignContext";

const MODES: IngredientDesignMode[] = ["card", "edge", "minimal"];

export function DesignModeToggle() {
  const { designMode, setDesignMode } = useIngredientDesign();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1">
      {MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => setDesignMode(mode)}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
            designMode === mode
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          )}
        >
          {DESIGN_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  );
}
