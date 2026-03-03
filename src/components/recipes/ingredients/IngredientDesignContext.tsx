"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type IngredientDesignMode = "card" | "edge" | "minimal";

interface IngredientDesignContextType {
  designMode: IngredientDesignMode;
  setDesignMode: (mode: IngredientDesignMode) => void;
}

const IngredientDesignContext = createContext<IngredientDesignContextType | null>(null);

export function IngredientDesignProvider({ children }: { children: ReactNode }) {
  const [designMode, setDesignMode] = useState<IngredientDesignMode>("card");

  return (
    <IngredientDesignContext.Provider value={{ designMode, setDesignMode }}>
      {children}
    </IngredientDesignContext.Provider>
  );
}

export function useIngredientDesign() {
  const context = useContext(IngredientDesignContext);
  if (!context) {
    throw new Error("useIngredientDesign must be used within IngredientDesignProvider");
  }
  return context;
}

export const DESIGN_MODE_LABELS: Record<IngredientDesignMode, string> = {
  card: "Card (Default)",
  edge: "Edge-to-Edge",
  minimal: "Minimal",
};

export const DESIGN_MODE_DESCRIPTIONS: Record<IngredientDesignMode, string> = {
  card: "Groups in outlined cards",
  edge: "Full-width with colored left border",
  minimal: "Typography hierarchy only",
};
