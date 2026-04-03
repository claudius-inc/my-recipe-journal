import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecipeImporter } from "../base/RecipeImporter";
import type { ExtractedRecipeData } from "../base/types";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";
import { parseInstructionsToSteps } from "@/lib/recipe-steps-helpers";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not configured. URL import will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Analyze this HTML webpage and extract structured recipe data.

Return ONLY valid JSON matching this exact schema:
{
  "name": "Recipe title",
  "category": {
    "primary": "baking" | "cooking" | "beverages" | "other",
    "secondary": "bread" | "sourdough" | "cookies" | "cakes" | "pastries" | "pies" | "main_dish" | "appetizer" | "side_dish" | "sauce" | "condiment" | "coffee" | "tea" | "cocktail" | "smoothie" | "fermented" | "other"
  },
  "description": "Brief description (optional)",
  "ingredientGroups": [
    {
      "name": "group name (e.g. Dough, Filling, Topping, or just Ingredients if only one group)",
      "ingredients": [
        {
          "name": "ingredient name",
          "quantity": numeric value or null (null for "to taste" items),
          "unit": "g" | "ml" | "cup" | "tbsp" | "tsp" | "oz" | "lb" | "each" | "to taste",  // when unit is "to taste", quantity can be null
          "role": "flour" | "liquid" | "leavening" | "salt" | "sweetener" | "fat" | "other",
          "notes": "any clarifications (optional)"
        }
      ]
    }
  ],
  "instructions": "Combined process steps (optional)",
  "servings": numeric value (optional),
  "imageUrl": "URL of the main recipe photo (optional)"
}

Rules:
1. Extract the recipe title from h1, title tag, or meta tags
2. Identify ALL ingredients with their quantities
3. Group ingredients logically (e.g. Dough, Filling, Frosting). If the recipe has no clear groups, use a single group named "Ingredients"
4. Convert measurements to standard units (grams, ml, cups, etc.)
5. Assign appropriate ingredient roles based on their function
6. Extract step-by-step instructions if available
7. Infer the most appropriate category based on the recipe type
8. Extract the main recipe photo URL from og:image, twitter:image meta tags, or the primary recipe image in the content
9. Only extract ONE main photo URL - prefer meta tags (og:image, twitter:image) over content images
10. Only include fields that have data - omit optional fields if not found
11. Return ONLY the JSON object, no markdown formatting or explanations
12. If the page doesn't contain a recipe, return an error in this format: {"error": "No recipe found on this page"}`;

/**
 * Fallback importer using Gemini AI for any website
 */
export class GeminiImporter extends RecipeImporter {
  readonly name = "Gemini AI (Universal)";

  canHandle(_url: string): boolean {
    // This is the fallback importer, so it can handle any URL
    return true;
  }

  async extract(url: string): Promise<ExtractedRecipeData> {
    if (!genAI) {
      throw new Error(
        "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
      );
    }

    // Validate URL
    this.validateUrl(url);

    // Fetch HTML
    const html = await this.fetchHtml(url);

    // Extract recipe using Gemini with retry logic
    const extractedData = await this.extractWithRetry(html, url);

    return extractedData;
  }

  private async extractWithRetry(
    html: string,
    url: string,
    maxRetries: number = 2,
  ): Promise<ExtractedRecipeData> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await this.extractRecipe(html, url);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        if (attempt < maxRetries - 1) {
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error("Failed to extract recipe after retries");
  }

  private async extractRecipe(html: string, url: string): Promise<ExtractedRecipeData> {
    if (!genAI) {
      throw new Error("Gemini API not configured");
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      // Truncate HTML if too large (keep first 50000 chars to stay within limits)
      const truncatedHtml = html.length > 50000 ? html.substring(0, 50000) : html;

      const prompt = `${EXTRACTION_PROMPT}\n\nHTML Content:\n${truncatedHtml}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean response - remove markdown code blocks if present
      const cleaned = text
        .replace(/```json\s*/g, "")
        .replace(/```\s*$/g, "")
        .trim();

      const parsed = JSON.parse(cleaned) as
        | { error: string }
        | {
            name: string;
            category: RecipeCategory;
            description?: string;
            ingredients?: Array<{
              name: string;
              quantity: number | null;
              unit: string;
              role: IngredientRole;
              notes?: string;
            }>;
            ingredientGroups?: Array<{
              name: string;
              ingredients: Array<{
                name: string;
                quantity: number | null;
                unit: string;
                role: IngredientRole;
                notes?: string;
              }>;
            }>;
            instructions?: string;
            servings?: number;
            imageUrl?: string;
          };

      // Check if Gemini returned an error
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }

      // Validate required fields
      const hasIngredients =
        Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0;
      const hasGroups =
        Array.isArray(parsed.ingredientGroups) && parsed.ingredientGroups.length > 0;
      if (!parsed.name || !parsed.category || (!hasIngredients && !hasGroups)) {
        throw new Error("Invalid response structure from Gemini");
      }

      // Populate flat ingredients from groups for backward compatibility
      if (hasGroups && !hasIngredients) {
        parsed.ingredients = parsed.ingredientGroups!.flatMap((g) => g.ingredients);
      }

      // Validate category structure
      if (
        !parsed.category.primary ||
        !parsed.category.secondary ||
        typeof parsed.category !== "object"
      ) {
        throw new Error("Invalid category structure in response");
      }

      // Convert instructions to steps if present
      const steps = parsed.instructions
        ? parseInstructionsToSteps(parsed.instructions)
        : [];

      // Add sourceUrl
      const result_data: ExtractedRecipeData = {
        ...parsed,
        ingredients: parsed.ingredients ?? [],
        steps: steps.length > 0 ? steps : undefined,
        sourceUrl: url,
      };

      return result_data;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("JSON")) {
          throw new Error("Failed to parse recipe data: Invalid response from AI");
        }
        throw new Error(`Failed to extract recipe: ${error.message}`);
      }
      throw new Error("Failed to extract recipe from URL");
    }
  }
}
