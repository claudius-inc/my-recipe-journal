import type { ExtractedRecipeData as GeminiExtractedRecipeData } from "@/lib/gemini";

/**
 * Extended recipe data that includes the source URL for attribution
 */
export interface ExtractedRecipeData extends GeminiExtractedRecipeData {
  sourceUrl: string;
}

/**
 * Base interface for all recipe importers
 */
export interface RecipeImporter {
  /**
   * Human-readable name of the importer (e.g., "Cotta.jp")
   */
  name: string;

  /**
   * Check if this importer can handle the given URL
   */
  canHandle(url: string): boolean;

  /**
   * Extract recipe data from the given URL
   */
  extract(url: string): Promise<ExtractedRecipeData>;
}
