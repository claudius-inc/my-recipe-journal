"use client";

import { useState } from "react";

import { RecipeStoreProvider } from "@/store/RecipeStore";
import { RecipeSidebar } from "@/components/layout/RecipeSidebar";
import { RecipeView } from "@/components/recipes/RecipeView";
import { Header } from "@/components/layout/Header";

export function RecipeWorkspace() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RecipeStoreProvider>
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex h-[calc(100dvh-50px)] w-full bg-surface text-foreground">
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
