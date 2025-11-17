import type { RecipeStep } from "@/types/recipes";

/**
 * Parse string instructions to RecipeStep array
 * Handles formats like:
 * - "1. Mix flour\n\n2. Bake"
 * - "1\nMix flour\n\n2\nBake"
 * - "Mix flour\nBake"
 */
export function parseInstructionsToSteps(text: string): RecipeStep[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const lines = text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const steps: RecipeStep[] = [];
  let currentStepText: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is ONLY a number (e.g., "1", "2", "3")
    const standaloneNumber = /^(\d+)$/.test(line);

    // Check if line starts with "1. " or "1) " format
    const numberedLine = /^(\d+)[\.\)]\s*(.*)$/.exec(line);

    if (standaloneNumber) {
      // Save previous step before starting new one
      if (currentStepText.length > 0) {
        steps.push({
          order: steps.length + 1,
          text: currentStepText.join("\n").trim(),
        });
        currentStepText = [];
      }
      // Next lines will be the step content
    } else if (numberedLine) {
      // Traditional "1. Text" format
      if (currentStepText.length > 0) {
        steps.push({
          order: steps.length + 1,
          text: currentStepText.join("\n").trim(),
        });
        currentStepText = [];
      }

      const text = numberedLine[2].trim();
      if (text) {
        currentStepText.push(text);
      }
    } else {
      // Regular text - accumulate as part of current step
      currentStepText.push(line);
    }
  }

  // Don't forget the last step
  if (currentStepText.length > 0) {
    steps.push({
      order: steps.length + 1,
      text: currentStepText.join("\n").trim(),
    });
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
