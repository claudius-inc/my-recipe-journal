import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecipeImporter } from "../base/RecipeImporter";
import type { ExtractedRecipeData } from "../base/types";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";

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
  "servings": numeric value (optional)
}

Rules:
1. Extract the recipe title from h1, title tag, or meta tags
2. Identify ALL ingredients with their quantities
3. Convert measurements to standard units (grams, ml, cups, etc.)
4. Assign appropriate ingredient roles based on their function
5. Extract step-by-step instructions if available
6. Infer the most appropriate category based on the recipe type
7. Only include fields that have data - omit optional fields if not found
8. Return ONLY the JSON object, no markdown formatting or explanations
9. If the page doesn't contain a recipe, return an error in this format: {"error": "No recipe found on this page"}`;

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
            ingredients: Array<{
              name: string;
              quantity: number;
              unit: string;
              role: IngredientRole;
              notes?: string;
            }>;
            instructions?: string;
            servings?: number;
          };

      // Check if Gemini returned an error
      if ("error" in parsed) {
        throw new Error(parsed.error);
      }

      // Validate required fields
      if (!parsed.name || !parsed.category || !Array.isArray(parsed.ingredients)) {
        throw new Error("Invalid response structure from Gemini");
      }

      // Validate category structure
      if (
        !parsed.category.primary ||
        !parsed.category.secondary ||
        typeof parsed.category !== "object"
      ) {
        throw new Error("Invalid category structure in response");
      }

      // Add sourceUrl
      const result_data: ExtractedRecipeData = {
        ...parsed,
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
