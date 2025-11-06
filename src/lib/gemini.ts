import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not configured. Photo extraction will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

export interface ExtractedRecipeData {
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients: ExtractedIngredient[];
  instructions?: string;
  cookTime?: string;
  servings?: number;
  metadata?: Record<string, string | number>;
}

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Analyze this recipe image and extract structured data.

Return ONLY valid JSON matching this exact schema:
{
  "name": "Recipe title",
  "category": "bread" | "dessert" | "drink" | "main" | "sauce" | "other",
  "description": "Brief description (optional)",
  "ingredients": [
    {
      "name": "ingredient name",
      "quantity": numeric value,
      "unit": "g" | "ml" | "cup" | "tbsp" | "tsp" | "oz" | "lb" | "each" | "to taste",
      "role": "flour" | "liquid" | "preferment" | "salt" | "sweetener" | "fat" | "add_in" | "spice" | "other",
      "notes": "any clarifications (optional)"
    }
  ],
  "instructions": "Combined process steps (optional)",
  "cookTime": "e.g. 45 min, 1 hour 20 min (optional)",
  "servings": numeric value (optional),
  "metadata": {
    "bulkFermentation": "for bread recipes (optional)",
    "proofing": "for bread recipes (optional)",
    "sweetnessLevel": numeric 1-10 for desserts (optional),
    "texture": "for desserts (optional)",
    "brewTime": numeric seconds for drinks (optional)",
    "servingTemp": "for drinks (optional)",
    "viscosity": "for sauces (optional)",
    "pairings": "for sauces (optional)"
  }
}

Rules:
1. Infer category from context (bread items → "bread", cakes/cookies → "dessert", etc.)
2. Convert all measurements to standard units
3. Assign ingredient roles logically (flour types → "flour", water/milk → "liquid", etc.)
4. Extract ALL visible ingredients
5. If handwritten or unclear, make best guess
6. For metadata, only include fields relevant to the category
7. Return ONLY the JSON object, no markdown formatting or explanations`;

export async function extractRecipeFromPhoto(
  imageData: string,
  mimeType: string = "image/jpeg",
): Promise<ExtractedRecipeData> {
  if (!genAI) {
    throw new Error(
      "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      {
        inlineData: {
          data: imageData,
          mimeType,
        },
      },
      EXTRACTION_PROMPT,
    ]);

    const response = await result.response;
    const text = response.text();

    // Clean response - remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ExtractedRecipeData;

    // Validate required fields
    if (!parsed.name || !parsed.category || !Array.isArray(parsed.ingredients)) {
      throw new Error("Invalid response structure from Gemini");
    }

    // Ensure category is valid
    const validCategories: RecipeCategory[] = [
      "bread",
      "dessert",
      "drink",
      "main",
      "sauce",
      "other",
    ];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = "other";
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract recipe: ${error.message}`);
    }
    throw new Error("Failed to extract recipe from photo");
  }
}

export async function extractRecipeFromPhotoWithRetry(
  imageData: string,
  mimeType: string = "image/jpeg",
  maxRetries: number = 2,
): Promise<ExtractedRecipeData> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await extractRecipeFromPhoto(imageData, mimeType);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to extract recipe after retries");
}
