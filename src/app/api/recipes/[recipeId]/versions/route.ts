import { NextResponse } from "next/server";

import { createVersionFromBase, getRecipe } from "@/server/recipesService";

export async function POST(
  request: Request,
  { params }: { params: { recipeId: string } },
) {
  const recipeId = params.recipeId;

  const recipe = await getRecipe(recipeId);

  if (!recipe) {
    return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
  }

  const payload = (await request.json().catch(() => ({}))) as {
    title?: string;
    baseVersionId?: string;
    scalingFactor?: number;
    notes?: string;
    nextSteps?: string;
    setActive?: boolean;
  };

  if (payload.scalingFactor !== undefined && !(payload.scalingFactor > 0)) {
    return NextResponse.json(
      { error: "Scaling factor must be greater than 0" },
      { status: 400 },
    );
  }

  try {
    const updatedRecipe = await createVersionFromBase({
      recipeId,
      baseVersionId: payload.baseVersionId,
      scalingFactor: payload.scalingFactor,
      title: payload.title,
      notes: payload.notes,
      nextSteps: payload.nextSteps,
      setActive: payload.setActive,
    });

    return NextResponse.json({ data: updatedRecipe }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Base version not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
}
