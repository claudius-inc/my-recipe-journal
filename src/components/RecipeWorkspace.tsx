"use client";

import { useState } from "react";

import { RecipeStoreProvider } from "@/store/RecipeStore";
import { RecipeSidebar } from "@/components/layout/RecipeSidebar";
import { RecipeView } from "@/components/recipes/RecipeView";

export function RecipeWorkspace() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RecipeStoreProvider>
      <div className="flex h-dvh w-full bg-surface text-foreground">
        <RecipeSidebar
          isOpen={isSidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
        />
        <RecipeView onOpenSidebar={() => setSidebarOpen(true)} />
      </div>
    </RecipeStoreProvider>
  );
}
