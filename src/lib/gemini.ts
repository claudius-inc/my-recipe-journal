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
  steps?: Array<{ order: number; text: string }>;
  instructions?: string;
  cookTime?: string;
  servings?: number;
  metadata?: Record<string, string | number>;
  imageUrl?: string;
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

    // Ensure category is valid - map legacy string to hierarchical category
    const validCategoryStrings = ["bread", "dessert", "drink", "main", "sauce", "other"];
    const categoryMap: Record<string, RecipeCategory> = {
      bread: { primary: "baking", secondary: "bread" },
      dessert: { primary: "baking", secondary: "cookies" },
      drink: { primary: "beverages", secondary: "coffee" },
      main: { primary: "cooking", secondary: "main_dish" },
      sauce: { primary: "cooking", secondary: "sauce" },
      other: { primary: "other", secondary: "other" },
    };

    // If category is a string (legacy), convert to hierarchical
    if (typeof parsed.category === "string") {
      parsed.category = categoryMap[parsed.category] || {
        primary: "other",
        secondary: "other",
      };
    } else if (!parsed.category.primary || !parsed.category.secondary) {
      parsed.category = { primary: "other", secondary: "other" };
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
