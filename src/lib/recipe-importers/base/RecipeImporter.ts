import type { RecipeImporter as IRecipeImporter, ExtractedRecipeData } from "./types";

/**
 * Abstract base class for recipe importers
 */
export abstract class RecipeImporter implements IRecipeImporter {
  abstract readonly name: string;

  abstract canHandle(url: string): boolean;

  abstract extract(url: string): Promise<ExtractedRecipeData>;

  /**
   * Helper method to validate URL format
   */
  protected validateUrl(url: string): URL {
    try {
      return new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  /**
   * Helper method to fetch HTML from a URL with timeout
   */
  protected async fetchHtml(url: string, timeoutMs = 30000): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9,ja;q=0.8",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("Request timeout: The website took too long to respond");
        }
        throw error;
      }
      throw new Error("Failed to fetch webpage");
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
