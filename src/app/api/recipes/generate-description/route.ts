import { NextRequest, NextResponse } from "next/server";
import { generateRecipeDescription } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ingredients, category, name } = body;

    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json(
        { error: "Ingredients array is required" },
        { status: 400 },
      );
    }

    const description = await generateRecipeDescription({
      ingredients,
      category,
      name,
    });

    return NextResponse.json({ description }, { status: 200 });
  } catch (error) {
    console.error("Description generation error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API not configured")) {
        return NextResponse.json(
          { error: "Description generation service not configured" },
          { status: 503 },
        );
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `Generation failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate description" },
      { status: 500 },
    );
  }
}
