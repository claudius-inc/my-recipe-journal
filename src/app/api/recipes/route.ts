import { NextResponse, NextRequest } from "next/server";

import { RECIPE_CATEGORIES, type RecipeCategory } from "@/types/recipes";
import {
  createRecipe,
  listRecipes,
  type ListRecipesOptions,
} from "@/server/recipesService";
import { requireAuth } from "@/lib/auth-utils";

const allowedCategories = RECIPE_CATEGORIES;

export async function GET(request: NextRequest) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const options: ListRecipesOptions = {
    userId,
    cursor: cursor || null,
    limit: Number.isFinite(parsedLimit ?? NaN) ? parsedLimit : undefined,
  };

  const { recipes, nextCursor } = await listRecipes(options);

  return NextResponse.json({ data: recipes, nextCursor });
}

export async function POST(request: NextRequest) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    name?: string;
    category?: RecipeCategory;
    description?: string;
    tags?: string[];
  };

  if (!payload.name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!payload.category || !allowedCategories.includes(payload.category)) {
    return NextResponse.json({ error: "Invalid recipe category" }, { status: 400 });
  }

  const created = await createRecipe({
    userId,
    name: payload.name.trim(),
    category: payload.category,
    description: payload.description ?? null,
    tags: payload.tags,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
