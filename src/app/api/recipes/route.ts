import { NextResponse } from "next/server";

import { CATEGORY_CONFIGS, type RecipeCategory } from "@/types/recipes";
import {
  createRecipe,
  listRecipes,
  type ListRecipesOptions,
} from "@/server/recipesService";

const allowedCategories = Object.keys(CATEGORY_CONFIGS) as RecipeCategory[];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = searchParams.get("limit");

  const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
  const options: ListRecipesOptions = {
    cursor: cursor || null,
    limit: Number.isFinite(parsedLimit ?? NaN) ? parsedLimit : undefined,
  };

  const { recipes, nextCursor } = await listRecipes(options);

  return NextResponse.json({ data: recipes, nextCursor });
}

export async function POST(request: Request) {
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
    name: payload.name.trim(),
    category: payload.category,
    description: payload.description ?? null,
    tags: payload.tags,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
