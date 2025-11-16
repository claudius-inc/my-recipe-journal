import { NextRequest, NextResponse } from "next/server";
import { duplicateRecipe } from "@/server/recipesService";
import type { RecipeCategory } from "@/types/recipes";
import { requireAuth } from "@/lib/auth-utils";

export async function POST(
  request: NextRequest,
  { params }: { params: { recipeId: string } },
) {
  const { userId, error, status } = await requireAuth(request);
  if (!userId) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();
    const { name, category, copyTags, copyIngredients, copyNotes, copyRatings } = body;

    // Validate required fields
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Recipe name is required" }, { status: 400 });
    }

    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "Recipe category is required" }, { status: 400 });
    }

    // Validate boolean flags
    if (
      typeof copyTags !== "boolean" ||
      typeof copyIngredients !== "boolean" ||
      typeof copyNotes !== "boolean" ||
      typeof copyRatings !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid copy flags" }, { status: 400 });
    }

    const newRecipe = await duplicateRecipe({
      userId,
      sourceRecipeId: params.recipeId,
      name: name.trim(),
      category: category as RecipeCategory,
      copyTags,
      copyIngredients,
      copyNotes,
      copyRatings,
    });

    return NextResponse.json({ data: newRecipe }, { status: 201 });
  } catch (error) {
    console.error("Error duplicating recipe:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        return NextResponse.json({ error: "Source recipe not found" }, { status: 404 });
      }
      if (error.message.includes("Unauthorized")) {
        return NextResponse.json(
          { error: "You do not have permission to duplicate this recipe" },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ error: "Failed to duplicate recipe" }, { status: 500 });
  }
}
