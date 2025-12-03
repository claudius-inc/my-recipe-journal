import { NextResponse } from "next/server";
import { migrateIngredientsToGroup, getRecipe } from "@/server/recipesService";

export async function POST(
    request: Request,
    { params }: { params: { recipeId: string; versionId: string } }
) {
    const { recipeId, versionId } = params;

    const recipe = await getRecipe(recipeId);
    if (!recipe) {
        return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const payload = (await request.json().catch(() => ({}))) as {
        name?: string;
        enableBakersPercent?: boolean;
    };

    const updatedRecipe = await migrateIngredientsToGroup(
        recipeId,
        versionId,
        payload.name || "Ingredients",
        payload.enableBakersPercent || false
    );

    return NextResponse.json({ data: updatedRecipe });
}
