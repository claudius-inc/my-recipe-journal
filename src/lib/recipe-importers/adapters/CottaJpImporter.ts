import * as cheerio from "cheerio";
import { RecipeImporter } from "../base/RecipeImporter";
import type { ExtractedRecipeData } from "../base/types";
import type { IngredientRole } from "@/types/recipes";

/**
 * Recipe importer for Cotta.jp
 * Handles URLs like: https://www.cotta.jp/recipe/recipe.php?recipeid=00016428
 */
export class CottaJpImporter extends RecipeImporter {
  readonly name = "Cotta.jp";

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return (
        parsed.hostname === "www.cotta.jp" &&
        parsed.pathname === "/recipe/recipe.php" &&
        parsed.searchParams.has("recipeid")
      );
    } catch {
      return false;
    }
  }

  async extract(url: string): Promise<ExtractedRecipeData> {
    // Validate URL
    const parsedUrl = this.validateUrl(url);
    if (!this.canHandle(url)) {
      throw new Error("This URL is not a valid Cotta.jp recipe URL");
    }

    // Fetch HTML
    const html = await this.fetchHtml(url);

    // Parse with cheerio
    const $ = cheerio.load(html);

    // Try to extract from JSON-LD schema first (more reliable)
    const schemaData = this.extractFromSchema($);
    if (schemaData) {
      return {
        ...schemaData,
        sourceUrl: url,
      };
    }

    // Fallback to HTML parsing if schema not found
    const title = this.extractTitle($);
    const ingredients = this.extractIngredients($);
    const instructions = this.extractInstructions($);
    const category = this.extractCategory($);
    const servings = this.extractServings($);
    const description = this.extractDescription($);

    return {
      name: title,
      category,
      description,
      ingredients,
      instructions,
      servings,
      sourceUrl: url,
    };
  }

  /**
   * Extract recipe data from JSON-LD schema.org markup (if present)
   */
  private extractFromSchema(
    $: ReturnType<typeof cheerio.load>,
  ): Omit<ExtractedRecipeData, "sourceUrl"> | null {
    try {
      // Cotta.jp stores the recipe data in a JavaScript variable
      // Find all script tags and look for rich_card_json
      let schemaData: string | null = null;

      $("script").each((_, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes("var rich_card_json")) {
          // Extract the JSON object - find the opening brace and match to closing brace
          const startIdx = scriptContent.indexOf("var rich_card_json");
          if (startIdx !== -1) {
            const jsonStart = scriptContent.indexOf("{", startIdx);
            if (jsonStart !== -1) {
              let braceCount = 0;
              let jsonEnd = jsonStart;

              for (let i = jsonStart; i < scriptContent.length; i++) {
                if (scriptContent[i] === "{") braceCount++;
                if (scriptContent[i] === "}") braceCount--;

                if (braceCount === 0) {
                  jsonEnd = i;
                  break;
                }
              }

              schemaData = scriptContent.substring(jsonStart, jsonEnd + 1);
              return false; // Break the loop
            }
          }
        }
      });

      if (!schemaData) {
        return null;
      }

      const schema = JSON.parse(schemaData) as {
        "@type": string;
        name: string;
        description?: string;
        recipeYield?: string;
        recipeIngredient?: string[];
        recipeInstructions?: Array<{
          "@type": string;
          text: string;
        }>;
      };

      if (schema["@type"] !== "Recipe") {
        return null;
      }

      // Parse ingredients
      const ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        role: IngredientRole;
        notes?: string;
      }> = [];

      if (schema.recipeIngredient) {
        for (const ing of schema.recipeIngredient) {
          const parsed = this.parseIngredientLine(ing);
          if (parsed) {
            ingredients.push(parsed);
          }
        }
      }

      // Parse instructions
      let instructions: string | undefined;
      if (schema.recipeInstructions && schema.recipeInstructions.length > 0) {
        instructions = schema.recipeInstructions
          .filter((step) => step.text && step.text.trim().length > 0)
          .map((step, idx) => `${idx + 1}. ${step.text}`)
          .join("\n\n");
      }

      // Parse servings
      let servings: number | undefined;
      if (schema.recipeYield) {
        const match = schema.recipeYield.match(/(\d+)/);
        if (match) {
          servings = parseInt(match[1], 10);
        }
      }

      return {
        name: schema.name,
        category: this.inferCategoryFromName(schema.name),
        description: schema.description,
        ingredients,
        instructions,
        servings,
      };
    } catch (error) {
      console.warn("Failed to extract from schema:", error);
      return null;
    }
  }

  /**
   * Infer category from recipe name (used for schema extraction)
   */
  private inferCategoryFromName(name: string): ExtractedRecipeData["category"] {
    const lowerName = name.toLowerCase();

    if (
      lowerName.includes("パン") ||
      lowerName.includes("bread") ||
      lowerName.includes("ベーグル")
    ) {
      return { primary: "baking", secondary: "bread" };
    }

    if (
      lowerName.includes("クッキー") ||
      lowerName.includes("cookie") ||
      lowerName.includes("ビスケット")
    ) {
      return { primary: "baking", secondary: "cookies" };
    }

    if (
      lowerName.includes("ケーキ") ||
      lowerName.includes("cake") ||
      lowerName.includes("タルト")
    ) {
      return { primary: "baking", secondary: "cakes" };
    }

    if (lowerName.includes("パイ") || lowerName.includes("pie")) {
      return { primary: "baking", secondary: "pies" };
    }

    // Default to cookies for Cotta.jp desserts
    return { primary: "baking", secondary: "cookies" };
  }

  private extractTitle($: ReturnType<typeof cheerio.load>): string {
    // Try multiple selectors for title
    let title =
      $("h1.recipe-title").text().trim() ||
      $("h1").first().text().trim() ||
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $("title").text().trim();

    if (!title) {
      throw new Error("Could not extract recipe title from page");
    }

    // Clean up title (remove "- cotta" suffix if present)
    title = title.replace(/\s*-\s*cotta.*$/i, "").trim();

    return title;
  }

  private extractIngredients($: ReturnType<typeof cheerio.load>): Array<{
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string;
  }> {
    const ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      role: IngredientRole;
      notes?: string;
    }> = [];

    // Cotta.jp typically uses a table or list for ingredients
    // Try different selectors
    const ingredientElements = $(
      ".ingredient-list li, .ingredients li, table.ingredient tr, .recipe-ingredients li",
    );

    ingredientElements.each((_, element) => {
      const text = $(element).text().trim();
      if (!text) return;

      // Parse ingredient line (e.g., "強力粉 250g" or "水 150ml")
      const parsed = this.parseIngredientLine(text);
      if (parsed) {
        ingredients.push(parsed);
      }
    });

    // If no ingredients found with structured selectors, try fallback
    if (ingredients.length === 0) {
      const fallbackText = $("body").text();
      const materialSection = this.extractSection(fallbackText, [
        "材料",
        "Ingredients",
        "分量",
      ]);
      if (materialSection) {
        const lines = materialSection.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.length < 3) continue;
          const parsed = this.parseIngredientLine(trimmed);
          if (parsed) {
            ingredients.push(parsed);
          }
        }
      }
    }

    return ingredients;
  }

  private parseIngredientLine(line: string): {
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string;
  } | null {
    // Common patterns:
    // "強力粉 250g"
    // "水 150ml"
    // "塩 5g"
    // "イースト 3g"
    // Handle both with and without space

    // Pattern: name followed by number and optional unit
    const match = line.match(/^(.+?)\s*([0-9.]+)\s*([a-zA-Zぁ-んァ-ヶー]+)?/);

    if (!match) {
      // Try to handle ingredients without quantities (e.g., "適量", "to taste")
      if (line.includes("適量") || line.includes("少々")) {
        return {
          name: line.replace(/適量|少々/g, "").trim(),
          quantity: 0,
          unit: "to taste",
          role: this.inferRole(line),
        };
      }
      return null;
    }

    const name = match[1].trim();
    const quantity = parseFloat(match[2]);
    const unit = match[3]?.trim() || "g"; // Default to grams

    if (!name || isNaN(quantity)) {
      return null;
    }

    return {
      name,
      quantity,
      unit: this.normalizeUnit(unit),
      role: this.inferRole(name),
    };
  }

  private normalizeUnit(unit: string): string {
    const unitMap: Record<string, string> = {
      g: "g",
      グラム: "g",
      kg: "g", // Convert to base unit
      キロ: "g",
      ml: "ml",
      ミリリットル: "ml",
      l: "ml",
      リットル: "ml",
      cc: "ml",
      大さじ: "tbsp",
      小さじ: "tsp",
      カップ: "cup",
      個: "each",
      枚: "each",
      本: "each",
    };

    const normalized = unitMap[unit.toLowerCase()] || unit;

    // Convert kg to g
    if (unit === "kg" || unit === "キロ") {
      return "g";
    }
    // Convert l to ml
    if (unit === "l" || unit === "リットル") {
      return "ml";
    }

    return normalized;
  }

  private inferRole(name: string): IngredientRole {
    const lowerName = name.toLowerCase();

    // Flour
    if (
      lowerName.includes("flour") ||
      lowerName.includes("粉") ||
      lowerName.includes("強力粉") ||
      lowerName.includes("薄力粉") ||
      lowerName.includes("中力粉") ||
      lowerName.includes("全粒粉")
    ) {
      return "flour";
    }

    // Liquid
    if (
      lowerName.includes("water") ||
      lowerName.includes("milk") ||
      lowerName.includes("水") ||
      lowerName.includes("牛乳") ||
      lowerName.includes("豆乳")
    ) {
      return "liquid";
    }

    // Salt
    if (lowerName.includes("salt") || lowerName.includes("塩")) {
      return "salt";
    }

    // Sweetener
    if (
      lowerName.includes("sugar") ||
      lowerName.includes("honey") ||
      lowerName.includes("砂糖") ||
      lowerName.includes("はちみつ") ||
      lowerName.includes("蜂蜜")
    ) {
      return "sweetener";
    }

    // Fat
    if (
      lowerName.includes("butter") ||
      lowerName.includes("oil") ||
      lowerName.includes("バター") ||
      lowerName.includes("オイル") ||
      lowerName.includes("油")
    ) {
      return "fat";
    }

    // Yeast/Preferment
    if (
      lowerName.includes("yeast") ||
      lowerName.includes("starter") ||
      lowerName.includes("イースト") ||
      lowerName.includes("酵母") ||
      lowerName.includes("種")
    ) {
      return "preferment";
    }

    return "other";
  }

  private extractInstructions($: ReturnType<typeof cheerio.load>): string | undefined {
    // Try to find instructions section
    const instructionElements = $(
      ".recipe-steps li, .instructions li, .recipe-procedure li, ol li",
    );
    const steps: string[] = [];

    instructionElements.each((index, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 5) {
        steps.push(`${index + 1}. ${text}`);
      }
    });

    if (steps.length > 0) {
      return steps.join("\n\n");
    }

    // Fallback: try to extract from body text
    const bodyText = $("body").text();
    const procedureSection = this.extractSection(bodyText, [
      "作り方",
      "手順",
      "Instructions",
      "Procedure",
    ]);

    return procedureSection || undefined;
  }

  private extractSection(text: string, headers: string[]): string | null {
    for (const header of headers) {
      const regex = new RegExp(
        `${header}[：:\s]*([\s\S]*?)(?=\n[^\n]{1,20}[：:]|\n\n|$)`,
        "i",
      );
      const match = text.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  private extractCategory($: ReturnType<typeof cheerio.load>): {
    primary: "baking" | "cooking" | "beverages" | "other";
    secondary:
      | "bread"
      | "sourdough"
      | "cookies"
      | "cakes"
      | "pastries"
      | "pies"
      | "main_dish"
      | "appetizer"
      | "side_dish"
      | "sauce"
      | "condiment"
      | "coffee"
      | "tea"
      | "cocktail"
      | "smoothie"
      | "fermented"
      | "other";
  } {
    // Cotta.jp is primarily a baking site
    // Try to infer from category tags or keywords
    const bodyText = $("body").text().toLowerCase();

    if (bodyText.includes("パン") || bodyText.includes("bread")) {
      return { primary: "baking", secondary: "bread" };
    }

    if (
      bodyText.includes("クッキー") ||
      bodyText.includes("cookie") ||
      bodyText.includes("ビスケット")
    ) {
      return { primary: "baking", secondary: "cookies" };
    }

    if (
      bodyText.includes("ケーキ") ||
      bodyText.includes("cake") ||
      bodyText.includes("タルト") ||
      bodyText.includes("パイ")
    ) {
      return { primary: "baking", secondary: "cakes" };
    }

    // Default to bread for Cotta.jp
    return { primary: "baking", secondary: "bread" };
  }

  private extractServings($: ReturnType<typeof cheerio.load>): number | undefined {
    const text = $("body").text();

    // Look for serving patterns (Japanese and English)
    const servingPatterns = [
      /([0-9]+)\s*人分/,
      /([0-9]+)\s*servings?/i,
      /yields?\s*([0-9]+)/i,
      /([0-9]+)\s*個/,
    ];

    for (const pattern of servingPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const servings = parseInt(match[1], 10);
        if (!isNaN(servings) && servings > 0) {
          return servings;
        }
      }
    }

    return undefined;
  }

  private extractDescription($: ReturnType<typeof cheerio.load>): string | undefined {
    // Try meta description first
    const metaDesc = $('meta[name="description"]').attr("content")?.trim();
    if (metaDesc && metaDesc.length > 10) {
      return metaDesc;
    }

    // Try to find a description paragraph
    const descElement = $(".recipe-description, .description, p").first();
    const desc = descElement.text().trim();
    if (desc && desc.length > 10 && desc.length < 500) {
      return desc;
    }

    return undefined;
  }
}
