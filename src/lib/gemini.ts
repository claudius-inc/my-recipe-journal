import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";
import { parseInstructionsToSteps } from "./recipe-steps-helpers";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not configured. Photo extraction will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ExtractedIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

export interface ExtractedIngredientGroup {
  name: string;
  ingredients: ExtractedIngredient[];
}

export interface ExtractedRecipeData {
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients: ExtractedIngredient[];
  ingredientGroups?: ExtractedIngredientGroup[];
  steps?: Array<{ order: number; text: string }>;
  instructions?: string;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  restTime?: string;
  ovenTempC?: number;
  difficulty?: "easy" | "medium" | "hard";
  metadata?: Record<string, string | number>;
  imageUrl?: string;
}

const SCHEMA_AND_RULES = `Return ONLY valid JSON matching this exact schema:
{
  "name": "Recipe title",
  "category": {
    "primary": "baking" | "cooking" | "beverages" | "other",
    "secondary": "bread" | "sourdough" | "cookies" | "cakes" | "pastries" | "pies" | "main_dish" | "appetizer" | "side_dish" | "sauce" | "condiment" | "coffee" | "tea" | "cocktail" | "smoothie" | "fermented" | "other"
  },
  "description": "Brief description (optional)",
  "ingredientGroups": [
    {
      "name": "group name (e.g. Dough, Filling, Topping, or Ingredients if no distinct sections)",
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": numeric value or null (null for "to taste" items),
          "unit": "g" | "ml" | "cup" | "tbsp" | "tsp" | "oz" | "lb" | "each" | "to taste",
          "role": "flour" | "liquid" | "leavening" | "salt" | "sweetener" | "fat" | "other",
          "notes": "any clarifications (optional)"
        }
      ]
    }
  ],
  "instructions": "Combined process steps (optional)",
  "servings": numeric value (optional),
  "prepTime": "e.g. 20 min (optional)",
  "cookTime": "e.g. 45 min (optional)",
  "totalTime": "e.g. 1 hour 20 min (optional)",
  "restTime": "proof/chill/rest time, e.g. 8 hours (optional)",
  "ovenTempC": numeric oven temperature in CELSIUS (convert from Fahrenheit if needed, optional),
  "difficulty": "easy" | "medium" | "hard" (optional),
  "metadata": {
    "hydration": "for bread recipes (optional)",
    "bulkFermentation": "for bread recipes (optional)",
    "proofing": "for bread recipes (optional)",
    "sweetnessLevel": numeric 1-10 for desserts (optional),
    "texture": "for desserts (optional)",
    "brewTime": "for drinks (optional)",
    "servingTemp": "for drinks (optional)",
    "viscosity": "for sauces (optional)",
    "pairings": "for sauces (optional)"
  }
}

Rules:
1. Infer the most appropriate hierarchical category (primary + secondary).
2. Keep quantities in the units shown; do not convert between metric and imperial.
3. Assign ingredient roles logically (flour types → "flour", water/milk → "liquid", etc.)
4. Extract ALL visible ingredients
5. If handwritten or unclear, make best guess
6. For metadata, only include fields relevant to the category
7. ovenTempC must always be in Celsius (convert °F → °C: (F-32)*5/9)
8. Return ONLY the JSON object, no markdown formatting or explanations
9. If the recipe has distinct ingredient sections (e.g. Dough, Filling, Topping, Frosting, Crust), group ingredients under their section name. If there are no sections, use a single group named "Ingredients"`;

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Analyze this recipe image and extract structured data.\n\n${SCHEMA_AND_RULES}`;

const TEXT_EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract structured data from the recipe text provided.\n\n${SCHEMA_AND_RULES}`;

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Force a raw JSON response so we don't have to strip markdown fences.
      generationConfig: { responseMimeType: "application/json" },
    });

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

    // Defensive: strip code fences in case the model still wraps the JSON.
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ExtractedRecipeData;

    // Populate flat ingredients from groups for backward compatibility
    if (parsed.ingredientGroups && parsed.ingredientGroups.length > 0) {
      parsed.ingredients = parsed.ingredientGroups.flatMap((g) => g.ingredients);
    }

    // Validate required fields (category is sanitised downstream by the
    // shared normalizer, so we only guard the essentials here).
    if (
      !parsed.name ||
      !parsed.category ||
      !Array.isArray(parsed.ingredients) ||
      parsed.ingredients.length === 0
    ) {
      throw new Error("Invalid response structure from Gemini");
    }

    // Convert instructions to steps if present
    if (parsed.instructions && !parsed.steps) {
      parsed.steps = parseInstructionsToSteps(parsed.instructions);
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

export async function extractRecipeFromText(text: string): Promise<ExtractedRecipeData> {
  if (!genAI) {
    throw new Error(
      "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
    );
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const prompt = `${TEXT_EXTRACTION_PROMPT}\n\nRecipe text:\n${text.slice(0, 20000)}`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    const cleaned = raw
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as ExtractedRecipeData;

    if (parsed.ingredientGroups && parsed.ingredientGroups.length > 0) {
      parsed.ingredients = parsed.ingredientGroups.flatMap((g) => g.ingredients);
    }

    if (
      !parsed.name ||
      !parsed.category ||
      !Array.isArray(parsed.ingredients) ||
      parsed.ingredients.length === 0
    ) {
      throw new Error("Invalid response structure from Gemini");
    }

    if (parsed.instructions && !parsed.steps) {
      parsed.steps = parseInstructionsToSteps(parsed.instructions);
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to extract recipe: ${error.message}`);
    }
    throw new Error("Failed to extract recipe from text");
  }
}

export async function extractRecipeFromTextWithRetry(
  text: string,
  maxRetries: number = 2,
): Promise<ExtractedRecipeData> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await extractRecipeFromText(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError || new Error("Failed to extract recipe after retries");
}

interface GenerateDescriptionInput {
  ingredients: Array<{ name: string; quantity: number; unit: string; role?: string }>;
  category?: string;
  name?: string;
}

const DESCRIPTION_PROMPT = `You are a recipe description writer. Based on the provided ingredients, generate a concise, appetizing description of the bread or baked good.

The description should:
1. Be 1-2 sentences long
2. Highlight key characteristics (texture, flavor, complexity)
3. Mention standout ingredients or techniques if notable
4. Be professional but friendly in tone
5. Focus on what makes this recipe unique or appealing

Return ONLY the description text, no additional formatting or explanation.`;

export async function generateRecipeDescription(
  input: GenerateDescriptionInput,
): Promise<string> {
  if (!genAI) {
    throw new Error(
      "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const ingredientsList = input.ingredients
      .map(
        (ing) =>
          `- ${ing.name}: ${ing.quantity}${ing.unit}${ing.role ? ` (${ing.role})` : ""}`,
      )
      .join("\n");

    const context = [
      input.name ? `Recipe name: ${input.name}` : "",
      input.category ? `Category: ${input.category}` : "",
      "Ingredients:",
      ingredientsList,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `${DESCRIPTION_PROMPT}\n\n${context}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text().trim();

    if (!description) {
      throw new Error("Empty response from Gemini");
    }

    return description;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate description: ${error.message}`);
    }
    throw new Error("Failed to generate recipe description");
  }
}
