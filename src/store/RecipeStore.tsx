"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";

import {
  INGREDIENT_ROLES,
  isValidCategory,
  type DuplicateRecipeData,
  type IngredientRole,
  type Recipe,
  type RecipeCategory,
  type RecipeVersion,
} from "@/types/recipes";
import { getLastViewedRecipe, setLastViewedRecipe } from "@/lib/recipe-storage";

interface RecipeStoreValue {
  recipes: Recipe[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  selectedRecipeId: string | null;
  selectedVersionId: string | null;
  selectedRecipe: Recipe | undefined;
  selectedVersion: RecipeVersion | undefined;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  selectRecipe: (recipeId: string) => void;
  selectVersion: (recipeId: string, versionId: string) => Promise<void>;
  createRecipe: (payload: {
    name: string;
    category: RecipeCategory;
    description?: string;
  }) => Promise<void>;
  createRecipeWithData: (payload: {
    name: string;
    category: RecipeCategory;
    description?: string;
    ingredients?: Array<{
      name: string;
      quantity: number;
      unit: string;
      role: IngredientRole;
      notes?: string;
    }>;
    ingredientGroups?: Array<{
      name: string;
      ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        role: IngredientRole;
        notes?: string;
      }>;
    }>;
    steps?: Array<{ order: number; text: string }>;
    instructions?: string;
    imageUrl?: string;
  }) => Promise<void>;
  updateRecipe: (
    recipeId: string,
    payload: Partial<{
      name: string;
      description: string | null;
      category: RecipeCategory;
      tags: string[] | null;
    }>,
  ) => Promise<void>;
  archiveRecipe: (recipeId: string) => Promise<void>;
  unarchiveRecipe: (recipeId: string) => Promise<void>;
  pinRecipe: (recipeId: string) => Promise<void>;
  unpinRecipe: (recipeId: string) => Promise<void>;
  duplicateRecipe: (recipeId: string, data: DuplicateRecipeData) => Promise<void>;
  createVersion: (
    recipeId: string,
    payload: {
      title?: string;
      baseVersionId?: string;
      scalingFactor?: number;
      notes?: string;
      nextSteps?: string;
      setActive?: boolean;
    },
  ) => Promise<void>;
  updateVersion: (
    recipeId: string,
    versionId: string,
    payload: Partial<{
      title: string;
      steps: Array<{ order: number; text: string }>;
      notes: string;
      nextSteps: string;
      photoUrl: string | null;
      r2Key: string | null;
      tasteRating: number | undefined;
      visualRating: number | undefined;
      textureRating: number | undefined;
      tasteNotes: string;
      visualNotes: string;
      textureNotes: string;
    }>,
  ) => Promise<void>;
  deleteVersion: (recipeId: string, versionId: string) => Promise<void>;
  addIngredient: (
    recipeId: string,
    versionId: string,
    payload: {
      name: string;
      quantity: number;
      unit: string;
      role: IngredientRole;
      notes?: string;
      sortOrder?: number;
      groupId?: string;
    },
  ) => Promise<void>;
  updateIngredient: (
    recipeId: string,
    versionId: string,
    ingredientId: string,
    payload: Partial<{
      name: string;
      quantity: number;
      unit: string;
      role: IngredientRole;
      notes: string | null;
      sortOrder: number;
      groupId: string | null;
    }>,
  ) => Promise<void>;
  batchUpdateIngredients: (
    recipeId: string,
    versionId: string,
    updates: Array<{
      id: string;
      quantity?: number;
      name?: string;
      unit?: string;
      role?: IngredientRole;
      notes?: string | null;
      sortOrder?: number;
      groupId?: string | null;
    }>,
  ) => Promise<void>;
  deleteIngredient: (
    recipeId: string,
    versionId: string,
    ingredientId: string,
  ) => Promise<void>;
  createIngredientGroup: (
    recipeId: string,
    versionId: string,
    payload: {
      name: string;
      enableBakersPercent?: boolean;
    },
  ) => Promise<void>;
  updateIngredientGroup: (
    recipeId: string,
    versionId: string,
    groupId: string,
    payload: Partial<{
      name: string;
      enableBakersPercent: boolean;
      orderIndex: number;
    }>,
  ) => Promise<void>;
  migrateToGroups: (
    recipeId: string,
    versionId: string,
    payload: {
      name: string;
      enableBakersPercent: boolean;
    },
  ) => Promise<void>;
  deleteIngredientGroup: (
    recipeId: string,
    versionId: string,
    groupId: string,
  ) => Promise<void>;
  reorderIngredientGroups: (recipeId: string, groupIds: string[]) => Promise<void>;
  getIngredientSuggestions: (recipeId?: string) => Promise<string[]>;
}

const RecipeStoreContext = createContext<RecipeStoreValue | undefined>(undefined);

type RecipesPage = {
  data: Recipe[];
  nextCursor: string | null;
};

const RECIPES_QUERY_KEY = ["recipes"];
const PAGE_SIZE = 20;
const INGREDIENT_SUGGESTIONS_KEY = "ingredient-suggestions";

const buildRecipesQueryParams = (cursor: string | null) => {
  const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
  if (cursor) {
    params.set("cursor", cursor);
  }
  return params.toString();
};

const fetchRecipesPage = async (cursor: string | null): Promise<RecipesPage> => {
  const query = buildRecipesQueryParams(cursor);
  const response = await fetch(`/api/recipes?${query}`, { cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as {
    data?: Recipe[];
    nextCursor?: string | null;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load recipes");
  }

  return {
    data: body.data ?? [],
    nextCursor: body.nextCursor ?? null,
  };
};

const requestJson = async <T,>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  if (!("data" in body)) {
    throw new Error("Malformed API response");
  }

  return body.data as T;
};

export function RecipeStoreProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const recipesQuery = useInfiniteQuery({
    queryKey: RECIPES_QUERY_KEY,
    queryFn: ({ pageParam }: { pageParam?: string | null }) =>
      fetchRecipesPage(pageParam ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 60 * 24, // Keep unused data in cache for 24 hours
  });

  const recipes = useMemo(() => {
    const pages =
      (recipesQuery.data as InfiniteData<RecipesPage> | undefined)?.pages ?? [];
    return pages.flatMap((page) => page.data);
  }, [recipesQuery.data]);

  useEffect(() => {
    if (!recipes.length) {
      setSelectedRecipeId(null);
      setSelectedVersionId(null);
      return;
    }

    if (!selectedRecipeId || !recipes.some((recipe) => recipe.id === selectedRecipeId)) {
      // Try to restore last viewed recipe from localStorage
      const lastViewedId = getLastViewedRecipe();
      const lastViewedRecipe = lastViewedId
        ? recipes.find((recipe) => recipe.id === lastViewedId)
        : null;

      // Use last viewed recipe if it exists, otherwise use first recipe
      const targetRecipe = lastViewedRecipe ?? recipes[0];
      setSelectedRecipeId(targetRecipe.id);
      setSelectedVersionId(
        targetRecipe.activeVersionId ?? targetRecipe.versions[0]?.id ?? null,
      );
      return;
    }

    const current = recipes.find((recipe) => recipe.id === selectedRecipeId);
    if (!current) {
      return;
    }

    if (
      !selectedVersionId ||
      !current.versions.some((version) => version.id === selectedVersionId)
    ) {
      setSelectedVersionId(current.activeVersionId ?? current.versions[0]?.id ?? null);
    }
  }, [recipes, selectedRecipeId, selectedVersionId]);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId),
    [recipes, selectedRecipeId],
  );

  const selectedVersion = useMemo(() => {
    if (!selectedRecipe || !selectedVersionId) {
      return undefined;
    }
    return selectedRecipe.versions.find((version) => version.id === selectedVersionId);
  }, [selectedRecipe, selectedVersionId]);

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    await recipesQuery.refetch();
  }, [queryClient, recipesQuery]);

  const loadMore = useCallback(async () => {
    if (!recipesQuery.hasNextPage || recipesQuery.isFetchingNextPage) {
      return;
    }
    await recipesQuery.fetchNextPage();
  }, [recipesQuery]);

  const selectRecipe = useCallback(
    (recipeId: string) => {
      const recipe = recipes.find((item) => item.id === recipeId);
      if (!recipe) {
        return;
      }
      setSelectedRecipeId(recipeId);
      setSelectedVersionId(recipe.activeVersionId ?? recipe.versions[0]?.id ?? null);
      // Persist selection to localStorage
      setLastViewedRecipe(recipeId);
    },
    [recipes],
  );

  const selectVersion = useCallback<RecipeStoreValue["selectVersion"]>(
    async (recipeId, versionId) => {
      await requestJson<Recipe>(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        body: JSON.stringify({ activeVersionId: versionId }),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      setSelectedRecipeId(recipeId);
      setSelectedVersionId(versionId);
      // Persist selection to localStorage
      setLastViewedRecipe(recipeId);
    },
    [queryClient],
  );

  const createRecipe = useCallback<RecipeStoreValue["createRecipe"]>(
    async ({ name, category, description }) => {
      if (!name.trim()) {
        throw new Error("Recipe name is required");
      }
      if (!isValidCategory(category)) {
        throw new Error("Invalid recipe category");
      }

      const recipe = await requestJson<Recipe>("/api/recipes", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          description: description ?? null,
        }),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [INGREDIENT_SUGGESTIONS_KEY],
      });
      setSelectedRecipeId(recipe.id);
      setSelectedVersionId(recipe.activeVersionId ?? recipe.versions[0]?.id ?? null);
      // Persist selection to localStorage
      setLastViewedRecipe(recipe.id);
    },
    [queryClient],
  );

  const createRecipeWithData = useCallback<RecipeStoreValue["createRecipeWithData"]>(
    async ({
      name,
      category,
      description,
      ingredients,
      ingredientGroups,
      steps,
      instructions,
      imageUrl,
    }) => {
      if (!name.trim()) {
        throw new Error("Recipe name is required");
      }
      if (!isValidCategory(category)) {
        throw new Error("Invalid recipe category");
      }

      const recipe = await requestJson<Recipe>("/api/recipes", {
        method: "POST",
        body: JSON.stringify({
          name,
          category,
          description: description ?? null,
        }),
      });

      const versionId = recipe.activeVersionId ?? recipe.versions[0]?.id;
      if (!versionId) {
        throw new Error("Failed to create initial version");
      }

      // Add ingredients — grouped if available, flat otherwise
      if (ingredientGroups && ingredientGroups.length > 0) {
        const enableBakersPercent =
          category.primary === "baking" &&
          ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
            category.secondary,
          );

        for (const group of ingredientGroups) {
          // Create the group
          const updatedRecipe = await requestJson<Recipe>(
            `/api/recipes/${recipe.id}/versions/${versionId}/groups`,
            {
              method: "POST",
              body: JSON.stringify({
                name: group.name,
                enableBakersPercent,
              }),
            },
          );

          // Find the newly created group's ID
          const version = updatedRecipe.versions.find((v) => v.id === versionId);
          const createdGroup = version?.ingredientGroups
            ?.slice()
            .sort((a, b) => a.order - b.order)
            .findLast((g) => g.name === group.name);
          const groupId = createdGroup?.id;

          // Add each ingredient to this group
          for (const ingredient of group.ingredients) {
            await requestJson(
              `/api/recipes/${recipe.id}/versions/${versionId}/ingredients`,
              {
                method: "POST",
                body: JSON.stringify({ ...ingredient, groupId }),
              },
            );
          }
        }
      } else if (ingredients && ingredients.length > 0) {
        for (const ingredient of ingredients) {
          await requestJson(
            `/api/recipes/${recipe.id}/versions/${versionId}/ingredients`,
            {
              method: "POST",
              body: JSON.stringify(ingredient),
            },
          );
        }
      }

      // Update version with steps and/or image if provided
      const versionUpdates: {
        steps?: Array<{ order: number; text: string }>;
        photoUrl?: string;
      } = {};

      if (steps && steps.length > 0) {
        versionUpdates.steps = steps;
      }

      if (imageUrl) {
        versionUpdates.photoUrl = imageUrl;
      }

      if (Object.keys(versionUpdates).length > 0) {
        await requestJson(`/api/recipes/${recipe.id}/versions/${versionId}`, {
          method: "PATCH",
          body: JSON.stringify(versionUpdates),
        });
      }

      // Invalidate and refetch queries to ensure fresh data
      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({
        queryKey: [INGREDIENT_SUGGESTIONS_KEY],
      });

      // Force refetch of recipes to ensure the new recipe appears immediately
      await queryClient.refetchQueries({ queryKey: RECIPES_QUERY_KEY });

      setSelectedRecipeId(recipe.id);
      setSelectedVersionId(versionId);
      // Persist selection to localStorage
      setLastViewedRecipe(recipe.id);
    },
    [queryClient],
  );

  const updateRecipe = useCallback<RecipeStoreValue["updateRecipe"]>(
    async (recipeId, payload) => {
      await requestJson<Recipe>(`/api/recipes/${recipeId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const archiveRecipe = useCallback<RecipeStoreValue["archiveRecipe"]>(
    async (recipeId) => {
      // Optimistic update
      const previousData =
        queryClient.getQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY);

      // Update cache optimistically
      if (previousData) {
        queryClient.setQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY, {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            data: page.data.map((recipe) =>
              recipe.id === recipeId
                ? { ...recipe, archivedAt: new Date().toISOString() }
                : recipe,
            ),
          })),
        });
      }

      try {
        await requestJson<Recipe>(`/api/recipes/${recipeId}/archive`, {
          method: "PATCH",
        });

        // Refetch to ensure data consistency
        await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(RECIPES_QUERY_KEY, previousData);
        }
        throw error;
      }
    },
    [queryClient],
  );

  const unarchiveRecipe = useCallback<RecipeStoreValue["unarchiveRecipe"]>(
    async (recipeId) => {
      // Optimistic update
      const previousData =
        queryClient.getQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY);

      // Update cache optimistically
      if (previousData) {
        queryClient.setQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY, {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            data: page.data.map((recipe) =>
              recipe.id === recipeId ? { ...recipe, archivedAt: null } : recipe,
            ),
          })),
        });
      }

      try {
        await requestJson<Recipe>(`/api/recipes/${recipeId}/unarchive`, {
          method: "PATCH",
        });

        // Refetch to ensure data consistency
        await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(RECIPES_QUERY_KEY, previousData);
        }
        throw error;
      }
    },
    [queryClient],
  );

  const pinRecipe = useCallback<RecipeStoreValue["pinRecipe"]>(
    async (recipeId) => {
      // Optimistic update
      const previousData =
        queryClient.getQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY);

      // Update cache optimistically
      if (previousData) {
        queryClient.setQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY, {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            data: page.data.map((recipe) =>
              recipe.id === recipeId
                ? { ...recipe, pinnedAt: new Date().toISOString() }
                : recipe,
            ),
          })),
        });
      }

      try {
        await requestJson<Recipe>(`/api/recipes/${recipeId}/pin`, {
          method: "PATCH",
        });

        // Refetch to ensure data consistency
        await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(RECIPES_QUERY_KEY, previousData);
        }
        throw error;
      }
    },
    [queryClient],
  );

  const unpinRecipe = useCallback<RecipeStoreValue["unpinRecipe"]>(
    async (recipeId) => {
      // Optimistic update
      const previousData =
        queryClient.getQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY);

      // Update cache optimistically
      if (previousData) {
        queryClient.setQueryData<InfiniteData<RecipesPage>>(RECIPES_QUERY_KEY, {
          ...previousData,
          pages: previousData.pages.map((page) => ({
            ...page,
            data: page.data.map((recipe) =>
              recipe.id === recipeId ? { ...recipe, pinnedAt: null } : recipe,
            ),
          })),
        });
      }

      try {
        await requestJson<Recipe>(`/api/recipes/${recipeId}/unpin`, {
          method: "PATCH",
        });

        // Refetch to ensure data consistency
        await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      } catch (error) {
        // Rollback on error
        if (previousData) {
          queryClient.setQueryData(RECIPES_QUERY_KEY, previousData);
        }
        throw error;
      }
    },
    [queryClient],
  );

  const duplicateRecipe = useCallback<RecipeStoreValue["duplicateRecipe"]>(
    async (recipeId, data) => {
      const newRecipe = await requestJson<Recipe>(`/api/recipes/${recipeId}/duplicate`, {
        method: "POST",
        body: JSON.stringify(data),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });

      // Select the newly created recipe
      setSelectedRecipeId(newRecipe.id);
      setSelectedVersionId(
        newRecipe.activeVersionId ?? newRecipe.versions[0]?.id ?? null,
      );
      // Persist selection to localStorage
      setLastViewedRecipe(newRecipe.id);
    },
    [queryClient],
  );

  const createVersion = useCallback<RecipeStoreValue["createVersion"]>(
    async (recipeId, payload) => {
      const recipe = await requestJson<Recipe>(`/api/recipes/${recipeId}/versions`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
      setSelectedRecipeId(recipe.id);
      setSelectedVersionId(recipe.activeVersionId ?? recipe.versions[0]?.id ?? null);
      // Persist selection to localStorage
      setLastViewedRecipe(recipe.id);
    },
    [queryClient],
  );

  const updateVersion = useCallback<RecipeStoreValue["updateVersion"]>(
    async (recipeId, versionId, payload) => {
      await requestJson<Recipe>(`/api/recipes/${recipeId}/versions/${versionId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
    },
    [queryClient],
  );

  const deleteVersion = useCallback<RecipeStoreValue["deleteVersion"]>(
    async (recipeId, versionId) => {
      const recipe = await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}`,
        {
          method: "DELETE",
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
      setSelectedRecipeId(recipe.id);
      setSelectedVersionId(recipe.activeVersionId ?? recipe.versions[0]?.id ?? null);
      // Persist selection to localStorage
      setLastViewedRecipe(recipe.id);
    },
    [queryClient],
  );

  const addIngredient = useCallback<RecipeStoreValue["addIngredient"]>(
    async (recipeId, versionId, payload) => {
      if (!INGREDIENT_ROLES.includes(payload.role)) {
        throw new Error("Invalid ingredient role");
      }

      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/ingredients`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      // Invalidate cache in background without awaiting to avoid blocking/interrupting user input
      // The optimistic UI in IngredientList handles immediate feedback
      queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
    },
    [queryClient],
  );

  const updateIngredient = useCallback<RecipeStoreValue["updateIngredient"]>(
    async (recipeId, versionId, ingredientId, payload) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/ingredients/${ingredientId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
    },
    [queryClient],
  );

  const batchUpdateIngredients = useCallback<RecipeStoreValue["batchUpdateIngredients"]>(
    async (recipeId, versionId, updates) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/ingredients`,
        {
          method: "PATCH",
          body: JSON.stringify({ updates }),
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
    },
    [queryClient],
  );

  const deleteIngredient = useCallback<RecipeStoreValue["deleteIngredient"]>(
    async (recipeId, versionId, ingredientId) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/ingredients/${ingredientId}`,
        {
          method: "DELETE",
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
    },
    [queryClient],
  );

  const createIngredientGroup = useCallback<RecipeStoreValue["createIngredientGroup"]>(
    async (recipeId, versionId, payload) => {
      await requestJson<Recipe>(`/api/recipes/${recipeId}/versions/${versionId}/groups`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const updateIngredientGroup = useCallback<RecipeStoreValue["updateIngredientGroup"]>(
    async (recipeId, versionId, groupId, payload) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/groups/${groupId}`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const migrateToGroups = useCallback<RecipeStoreValue["migrateToGroups"]>(
    async (recipeId, versionId, payload) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/migrate`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const deleteIngredientGroup = useCallback<RecipeStoreValue["deleteIngredientGroup"]>(
    async (recipeId, versionId, groupId) => {
      await requestJson<Recipe>(
        `/api/recipes/${recipeId}/versions/${versionId}/groups/${groupId}`,
        {
          method: "DELETE",
        },
      );

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const reorderIngredientGroups = useCallback<
    RecipeStoreValue["reorderIngredientGroups"]
  >(
    async (recipeId, groupIds) => {
      await requestJson<Recipe>(`/api/recipes/${recipeId}/groups/reorder`, {
        method: "PUT",
        body: JSON.stringify({ groupIds }),
      });

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
    },
    [queryClient],
  );

  const getIngredientSuggestions = useCallback<
    RecipeStoreValue["getIngredientSuggestions"]
  >(
    async (recipeId) => {
      const queryKey = [INGREDIENT_SUGGESTIONS_KEY, recipeId ?? "all"];

      const suggestions = await queryClient.fetchQuery<string[]>({
        queryKey,
        queryFn: async () => {
          const params = new URLSearchParams();
          if (recipeId) {
            params.set("recipeId", recipeId);
          }

          const response = await fetch(
            `/api/ingredients/suggestions${params.size ? `?${params}` : ""}`,
          );
          const body = (await response.json().catch(() => ({}))) as {
            data?: string[];
            error?: string;
          };
          if (!response.ok) {
            throw new Error(body.error ?? "Failed to load ingredient suggestions");
          }
          return body.data ?? [];
        },
        staleTime: 1000 * 60 * 5,
      });

      return suggestions;
    },
    [queryClient],
  );

  const value = useMemo<RecipeStoreValue>(
    () => ({
      recipes,
      loading: recipesQuery.isInitialLoading,
      loadingMore: recipesQuery.isFetchingNextPage,
      hasMore: Boolean(recipesQuery.hasNextPage),
      error: recipesQuery.error?.message ?? null,
      selectedRecipeId,
      selectedVersionId,
      selectedRecipe,
      selectedVersion,
      refresh,
      loadMore,
      selectRecipe,
      selectVersion,
      createRecipe,
      createRecipeWithData,
      updateRecipe,
      archiveRecipe,
      unarchiveRecipe,
      pinRecipe,
      unpinRecipe,
      duplicateRecipe,
      createVersion,
      updateVersion,
      deleteVersion,
      addIngredient,
      updateIngredient,
      batchUpdateIngredients,
      deleteIngredient,
      createIngredientGroup,
      updateIngredientGroup,
      deleteIngredientGroup,
      reorderIngredientGroups,
      migrateToGroups,
      getIngredientSuggestions,
    }),
    [
      recipes,
      recipesQuery.isInitialLoading,
      recipesQuery.isFetchingNextPage,
      recipesQuery.hasNextPage,
      recipesQuery.error,
      selectedRecipeId,
      selectedVersionId,
      selectedRecipe,
      selectedVersion,
      refresh,
      loadMore,
      selectRecipe,
      selectVersion,
      createRecipe,
      createRecipeWithData,
      updateRecipe,
      archiveRecipe,
      unarchiveRecipe,
      pinRecipe,
      unpinRecipe,
      duplicateRecipe,
      createVersion,
      updateVersion,
      deleteVersion,
      addIngredient,
      updateIngredient,
      batchUpdateIngredients,
      deleteIngredient,
      createIngredientGroup,
      updateIngredientGroup,
      deleteIngredientGroup,
      reorderIngredientGroups,
      migrateToGroups,
      getIngredientSuggestions,
    ],
  );

  return (
    <RecipeStoreContext.Provider value={value}>{children}</RecipeStoreContext.Provider>
  );
}

export const useRecipeStore = () => {
  const context = useContext(RecipeStoreContext);
  if (!context) {
    throw new Error("useRecipeStore must be used within RecipeStoreProvider");
  }
  return context;
};
