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
  CATEGORY_CONFIGS,
  INGREDIENT_ROLES,
  RECIPE_CATEGORIES,
  type IngredientRole,
  type Recipe,
  type RecipeCategory,
  type RecipeVersion,
  type RecipeVersionMetadata,
} from "@/types/recipes";

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
  updateRecipe: (
    recipeId: string,
    payload: Partial<{
      name: string;
      description: string | null;
      category: RecipeCategory;
      tags: string[] | null;
    }>,
  ) => Promise<void>;
  createVersion: (
    recipeId: string,
    payload: {
      title?: string;
      baseVersionId?: string;
      scalingFactor?: number;
      metadata?: RecipeVersionMetadata;
      notes?: string;
      tastingNotes?: string;
      nextSteps?: string;
      setActive?: boolean;
    },
  ) => Promise<void>;
  updateVersion: (
    recipeId: string,
    versionId: string,
    payload: Partial<{
      title: string;
      notes: string;
      tastingNotes: string;
      nextSteps: string;
      metadata: RecipeVersionMetadata | null;
      photoUrl: string | null;
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
    }>,
  ) => Promise<void>;
  deleteIngredient: (
    recipeId: string,
    versionId: string,
    ingredientId: string,
  ) => Promise<void>;
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
    staleTime: 1000 * 30,
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
      const first = recipes[0];
      setSelectedRecipeId(first.id);
      setSelectedVersionId(first.activeVersionId ?? first.versions[0]?.id ?? null);
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
    },
    [queryClient],
  );

  const createRecipe = useCallback<RecipeStoreValue["createRecipe"]>(
    async ({ name, category, description }) => {
      if (!name.trim()) {
        throw new Error("Recipe name is required");
      }
      if (!RECIPE_CATEGORIES.includes(category)) {
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

      await queryClient.invalidateQueries({ queryKey: RECIPES_QUERY_KEY });
      await queryClient.invalidateQueries({ queryKey: [INGREDIENT_SUGGESTIONS_KEY] });
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
      updateRecipe,
      createVersion,
      updateVersion,
      deleteVersion,
      addIngredient,
      updateIngredient,
      deleteIngredient,
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
      updateRecipe,
      createVersion,
      updateVersion,
      deleteVersion,
      addIngredient,
      updateIngredient,
      deleteIngredient,
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

export const getCategoryConfig = (category: RecipeCategory) =>
  CATEGORY_CONFIGS[category] ?? CATEGORY_CONFIGS.other;
