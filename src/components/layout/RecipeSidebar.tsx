"use client";

import { Button } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import {
  DuplicateRecipeModal,
  ImportFromUrlModal,
  ImportFromPhotoModal,
} from "@/components/recipes/modals";

import { RecipeSearchHeader } from "./sidebar/RecipeSearchHeader";
import { RecipeList } from "./sidebar/RecipeList";
import { CreateRecipeForm } from "./sidebar/CreateRecipeForm";
import { SidebarToolbar } from "./sidebar/SidebarToolbar";
import { useSidebarLogic } from "./sidebar/useSidebarLogic";

interface RecipeSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
}

export function RecipeSidebar({ isOpen, onClose, onOpen }: RecipeSidebarProps) {
  const { state, actions } = useSidebarLogic(onClose, onOpen);

  return (
    <>
      {isOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-30 bg-neutral-950/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[85vw] max-w-sm flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform md:static md:z-auto md:h-full md:w-80 md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="space-y-3 border-b border-neutral-200 px-5 py-3">
          <RecipeSearchHeader
            query={state.query}
            onQueryChange={actions.setQuery}
            isExpanded={state.isSearchExpanded}
            onExpandToggle={actions.setIsSearchExpanded}
            onClose={onClose}
          />

          {(state.loading || state.error) && (
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
              {state.loading ? "Syncing recipes…" : state.error}
            </div>
          )}

          <div>
            <SidebarToolbar
              isScanning={state.isScanning}
              onCreateOpen={() => {
                actions.setIsCreating(true);
                onOpen();
              }}
              onPhotoScan={actions.handlePhotoScan}
              onImportOpen={() => {
                actions.setShowImportModal(true);
                onOpen();
              }}
              showArchived={state.showArchived}
              onToggleArchived={actions.setShowArchived}
              scanError={state.scanError}
            />

            {state.isCreating && (
              <CreateRecipeForm
                name={state.draftName}
                onNameChange={actions.setDraftName}
                category={state.draftCategory}
                onCategoryChange={actions.setDraftCategory}
                error={state.creationError}
                isSaving={state.isSaving}
                onSave={actions.persistRecipe}
                onCancel={() => {
                  actions.setIsCreating(false);
                  actions.setDraftName("");
                  actions.setCreationError(null);
                }}
              />
            )}
          </div>
        </div>

        {state.showArchived && (
          <Button
            variant="soft"
            size="2"
            className="w-full rounded-none py-5"
            onClick={() => actions.setShowArchived(false)}
          >
            <ArrowLeftIcon className="w-4 h-4 inline mr-2" />
            Back to active recipes
          </Button>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-3">
          <RecipeList
            recipes={state.filteredRecipes}
            loading={state.loading}
            query={state.query}
            showArchived={state.showArchived}
            hasMore={state.hasMore}
            loadingMore={state.loadingMore}
            onLoadMore={actions.loadMore}
            selectedId={state.selectedRecipeId}
            onSelect={(id) => {
              actions.selectRecipe(id);
              onClose();
            }}
            onTogglePin={actions.handleTogglePin}
            onToggleArchive={actions.handleToggleArchive}
            onDelete={actions.handleDeleteRecipe}
            onDuplicate={(recipe) => actions.setDuplicateModalRecipe(recipe)}
            animatingOut={state.animatingOut}
            justMoved={state.justMoved}
            archivingInProgress={state.archivingInProgress}
            pinningInProgress={state.pinningInProgress}
            deletingInProgress={state.deletingInProgress}
          />
        </div>
      </aside>

      {state.duplicateModalRecipe && (
        <DuplicateRecipeModal
          isOpen={!!state.duplicateModalRecipe}
          sourceRecipe={state.duplicateModalRecipe}
          onCancel={() => actions.setDuplicateModalRecipe(null)}
          onConfirm={actions.handleConfirmDuplicate}
          isLoading={state.isDuplicating}
        />
      )}

      {state.showImportModal && (
        <ImportFromUrlModal
          isOpen={state.showImportModal}
          onClose={() => actions.setShowImportModal(false)}
          onImport={actions.handleImportFromUrl}
        />
      )}

      {state.showPhotoModal && (
        <ImportFromPhotoModal
          isOpen={state.showPhotoModal}
          onClose={() => actions.setShowPhotoModal(false)}
          onImport={actions.handleImportFromPhoto}
        />
      )}
    </>
  );
}
