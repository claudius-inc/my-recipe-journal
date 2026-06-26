import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecipeImporter } from "../base/RecipeImporter";
import type { ExtractedRecipeData } from "../base/types";
import type { RecipeCategory, IngredientRole } from "@/types/recipes";
import { parseInstructionsToSteps } from "@/lib/recipe-steps-helpers";
import { extractRecipeFromJsonLd } from "../jsonld";

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
  "prepTime": "e.g. 20 min (optional)",
  "cookTime": "e.g. 45 min (optional)",
  "totalTime": "e.g. 1 hour 20 min (optional)",
  "restTime": "proof/chill/rest time (optional)",
  "ovenTempC": numeric oven temperature in CELSIUS (convert from Fahrenheit if needed, optional),
  "difficulty": "easy" | "medium" | "hard" (optional),
  "metadata": { "hydration": "...", "proofing": "...", "brewTime": "...", "sweetnessLevel": numeric } (category-specific extras, optional)
}

Rules:
1. Extract the recipe title from h1, title tag, or meta tags
2. Identify ALL ingredients with their quantities
3. Group ingredients logically (e.g. Dough, Filling, Frosting). If the recipe has no clear groups, use a single group named "Ingredients"
4. Keep quantities in the units shown; do NOT convert between metric and imperial
5. Assign appropriate ingredient roles based on their function
6. Extract step-by-step instructions if available
7. Infer the most appropriate category based on the recipe type
8. ovenTempC must always be in Celsius (convert °F → °C: (F-32)*5/9)
9. Only include fields that have data - omit optional fields if not found
10. Return ONLY the JSON object, no markdown formatting or explanations
11. If the page doesn't contain a recipe, return an error in this format: {"error": "No recipe found on this page"}`;

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
    this.validateUrl(url);

    const html = await this.fetchHtml(url);

    // Prefer structured schema.org/Recipe data when the page publishes it —
    // far more reliable and cheaper than an LLM round-trip.
    const jsonLd = extractRecipeFromJsonLd(html);
    if (jsonLd && jsonLd.ingredients.length > 0) {
      return {
        name: jsonLd.name ?? "",
        category: jsonLd.category,
        description: jsonLd.description,
        ingredients: jsonLd.ingredients,
        ingredientGroups: [{ name: "Ingredients", ingredients: jsonLd.ingredients }],
        steps: jsonLd.steps.length > 0 ? jsonLd.steps : undefined,
        servings: jsonLd.servings,
        prepTime: jsonLd.prepTime,
        cookTime: jsonLd.cookTime,
        totalTime: jsonLd.totalTime,
        imageUrl: jsonLd.imageUrl ?? this.extractOgImage(html),
        sourceUrl: url,
      };
    }

    if (!genAI) {
      throw new Error(
        "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
      );
    }

    return this.extractWithRetry(html, url);
  }

  /** Reduce a full HTML page to its readable text for the LLM prompt. */
  private htmlToText(html: string): string {
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, nav, header, footer, iframe, form").remove();
    const main = $("main").text() || $("article").text() || $("body").text();
    const text = main.replace(/\s+/g, " ").trim();
    return text.length > 24000 ? text.slice(0, 24000) : text;
  }

  /** Pull the main photo from social meta tags. */
  private extractOgImage(html: string): string | undefined {
    const $ = cheerio.load(html);
    return (
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content") ||
      undefined
    );
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
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        // Force raw JSON so we don't fight markdown fences.
        generationConfig: { responseMimeType: "application/json" },
      });

      // Send cleaned readable text rather than raw markup: smaller, focused,
      // and far less likely to truncate the recipe off the end of the page.
      const content = this.htmlToText(html);
      const prompt = `${EXTRACTION_PROMPT}\n\nRecipe page content:\n${content}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

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
            prepTime?: string;
            cookTime?: string;
            totalTime?: string;
            restTime?: string;
            ovenTempC?: number;
            difficulty?: "easy" | "medium" | "hard";
            metadata?: Record<string, string | number>;
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

      // Convert instructions to steps if present
      const steps = parsed.instructions
        ? parseInstructionsToSteps(parsed.instructions)
        : [];

      const result_data: ExtractedRecipeData = {
        ...parsed,
        ingredients: parsed.ingredients ?? [],
        steps: steps.length > 0 ? steps : undefined,
        // Prefer meta-tag image (cleaned text drops the <head>).
        imageUrl: this.extractOgImage(html) ?? parsed.imageUrl,
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
