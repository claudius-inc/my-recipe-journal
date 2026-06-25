import { NextResponse, NextRequest } from "next/server";

import { isValidCategory } from "@/types/recipes";
import { requireAuth } from "@/lib/auth-utils";
import { normalizeExtractedRecipe } from "@/lib/recipe-importers/normalize";
import {
  importRecipe,
  findRecipeBySourceUrl,
  type ImportRecipeInput,
} from "@/server/recipesService";

export const runtime = "nodejs";

// Secondary categories that use baker's percentages by default.
const BAKERS_PERCENT_SECONDARIES = [
  "bread",
  "sourdough",
  "cookies",
  "cakes",
  "pastries",
  "pies",
];

function deriveSourceName(sourceUrl?: string | null): string | null {
  if (!sourceUrl) return null;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Single-shot recipe import. Accepts the (possibly user-edited) extracted
 * payload, re-sanitises it server-side, and persists the whole recipe in one
 * request. Returns the created recipe plus a `duplicateOf` hint when the same
 * source URL was already imported.
 */
export async function POST(request: NextRequest) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const raw = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const data = normalizeExtractedRecipe(raw);

  if (!data.name.trim()) {
    return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
  }
  if (!isValidCategory(data.category)) {
    return NextResponse.json({ error: "Invalid recipe category" }, { status: 400 });
  }

  const enableBakersPercent =
    data.category.primary === "baking" &&
    BAKERS_PERCENT_SECONDARIES.includes(data.category.secondary);

  const sourceUrl = typeof raw.sourceUrl === "string" ? raw.sourceUrl : null;
  const duplicate = sourceUrl ? await findRecipeBySourceUrl(userId, sourceUrl) : null;

  const input: ImportRecipeInput = {
    userId,
    name: data.name,
    category: data.category,
    description: typeof data.description === "string" ? data.description : null,
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : undefined,
    sourceUrl,
    sourceName: deriveSourceName(sourceUrl),
    steps: Array.isArray(raw.steps)
      ? (raw.steps as Array<{ order: number; text: string }>)
      : undefined,
    photoUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    servings: typeof raw.servings === "number" ? raw.servings : null,
    prepTime: typeof raw.prepTime === "string" ? raw.prepTime : null,
    cookTime: typeof raw.cookTime === "string" ? raw.cookTime : null,
    totalTime: typeof raw.totalTime === "string" ? raw.totalTime : null,
    restTime: typeof raw.restTime === "string" ? raw.restTime : null,
    ovenTempC: typeof raw.ovenTempC === "number" ? raw.ovenTempC : null,
    difficulty:
      raw.difficulty === "easy" ||
      raw.difficulty === "medium" ||
      raw.difficulty === "hard"
        ? raw.difficulty
        : null,
    metadata:
      raw.metadata && typeof raw.metadata === "object"
        ? (raw.metadata as Record<string, string | number>)
        : null,
    ingredientGroups: data.ingredientGroups?.map((g) => ({
      name: g.name,
      enableBakersPercent,
      ingredients: g.ingredients,
    })),
    ingredients: data.ingredientGroups ? undefined : data.ingredients,
  };

  const recipe = await importRecipe(input);

  return NextResponse.json({ data: recipe, duplicateOf: duplicate }, { status: 201 });
}
