import type { RecipeImporter } from "./base/types";
import { CottaJpImporter } from "./adapters/CottaJpImporter";
import { GeminiImporter } from "./gemini/GeminiImporter";

/**
 * Registry of all available recipe importers
 * Order matters: more specific importers should come first
 */
const IMPORTERS: RecipeImporter[] = [
  new CottaJpImporter(),
  // Add more site-specific importers here in the future
  // new AllRecipesImporter(),
  // new SeriousEatsImporter(),
  // ...
];

/**
 * Fallback importer that uses Gemini AI for any website
 */
const FALLBACK_IMPORTER = new GeminiImporter();

/**
 * Get the appropriate importer for a given URL
 * Returns a site-specific adapter if available, otherwise returns the Gemini fallback
 */
export function getImporter(url: string): RecipeImporter {
  // Try to find a specific importer that can handle this URL
  for (const importer of IMPORTERS) {
    if (importer.canHandle(url)) {
      return importer;
    }
  }

  // Fall back to Gemini AI importer
  return FALLBACK_IMPORTER;
}

/**
 * Get list of all supported site-specific importers (excluding fallback)
 */
export function getSupportedSites(): string[] {
  return IMPORTERS.map((importer) => importer.name);
}

/**
 * Check if a URL has a dedicated adapter (vs using AI fallback)
 */
export function hasSpecificAdapter(url: string): boolean {
  return IMPORTERS.some((importer) => importer.canHandle(url));
}
