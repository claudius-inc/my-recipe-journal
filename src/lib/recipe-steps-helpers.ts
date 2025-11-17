import type { RecipeStep } from "@/types/recipes";

/**
 * Parse string instructions to RecipeStep array
 * Handles formats like:
 * - "1. Mix flour\n\n2. Bake"
 * - "Mix flour\nBake"
 */
export function parseInstructionsToSteps(text: string): RecipeStep[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Split by double newlines or single newlines
  const lines = text
    .split(/\n\n|\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const steps: RecipeStep[] = [];
  let order = 1;

  for (const line of lines) {
    // Remove existing numbering like "1. ", "2. ", "1) ", etc.
    const cleaned = line.replace(/^\d+[\.\)]\s*/, "").trim();

    if (cleaned.length > 0) {
      steps.push({
        order: order++,
        text: cleaned,
      });
    }
  }

  return steps;
}

/**
 * Convert RecipeStep array to formatted text
 */
export function formatStepsAsText(steps: RecipeStep[]): string {
  if (!steps || steps.length === 0) return "";
  return steps.map((s) => `${s.order}. ${s.text}`).join("\n\n");
}

/**
 * Type guard for RecipeStep array validation
 */
export function validateSteps(steps: unknown): steps is RecipeStep[] {
  if (!Array.isArray(steps)) return false;

  return steps.every(
    (step) =>
      typeof step === "object" &&
      step !== null &&
      "order" in step &&
      "text" in step &&
      typeof step.order === "number" &&
      typeof step.text === "string",
  );
}
