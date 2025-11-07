import type { Ingredient, IngredientRole } from "@/types/recipes";

export interface ValidationWarning {
  type: "flour_percentage" | "role_mismatch" | "missing_flour" | "info";
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * Validate ingredient roles and percentages for bread recipes
 */
export function validateIngredients(
  ingredients: Ingredient[],
  enableBakersPercent: boolean = false,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  if (!ingredients.length) {
    return warnings;
  }

  // Calculate totals by role
  const flourTotal = ingredients
    .filter((ing) => ing.role === "flour")
    .reduce((sum, ing) => sum + ing.quantity, 0);

  const liquidTotal = ingredients
    .filter((ing) => ing.role === "liquid")
    .reduce((sum, ing) => sum + ing.quantity, 0);

  // Check for bread-specific validations
  if (enableBakersPercent) {
    // Missing flour warning
    if (flourTotal === 0) {
      warnings.push({
        type: "missing_flour",
        message:
          "No flour ingredients found. Baker's percentages require at least one flour.",
        severity: "warning",
      });
    }

    // Flour percentage check
    if (flourTotal > 0) {
      const flourPercentages = ingredients
        .filter((ing) => ing.role === "flour")
        .map((ing) => (ing.quantity / flourTotal) * 100);

      const totalFlourPercent = flourPercentages.reduce((sum, pct) => sum + pct, 0);

      // If using multiple flours, show info about the distribution
      if (flourPercentages.length > 1) {
        warnings.push({
          type: "info",
          message: `Using ${flourPercentages.length} flour types. Total: ${flourTotal.toFixed(0)}g (100%)`,
          severity: "info",
        });
      }

      // Check hydration level
      if (liquidTotal > 0) {
        const hydration = (liquidTotal / flourTotal) * 100;
        if (hydration < 50) {
          warnings.push({
            type: "info",
            message: `Low hydration (${hydration.toFixed(0)}%). This may result in a stiff dough.`,
            severity: "info",
          });
        } else if (hydration > 90) {
          warnings.push({
            type: "info",
            message: `High hydration (${hydration.toFixed(0)}%). This dough will be very wet and sticky.`,
            severity: "info",
          });
        }
      }
    }
  }

  // Role mismatch warnings
  ingredients.forEach((ing) => {
    const nameLower = ing.name.toLowerCase();

    // Check for common role mismatches
    if (ing.role === "flour" && !nameLower.includes("flour")) {
      if (!["semolina", "cornmeal", "masa"].some((term) => nameLower.includes(term))) {
        warnings.push({
          type: "role_mismatch",
          message: `"${ing.name}" is marked as flour but name doesn't contain "flour". Verify role is correct.`,
          severity: "warning",
        });
      }
    }

    if (ing.role === "liquid" && nameLower.includes("oil")) {
      warnings.push({
        type: "role_mismatch",
        message: `"${ing.name}" is marked as liquid but might be better as "fat". Oil adds richness, not hydration.`,
        severity: "info",
      });
    }

    if (
      ing.role === "other" &&
      (nameLower.includes("yeast") || nameLower.includes("starter"))
    ) {
      warnings.push({
        type: "role_mismatch",
        message: `"${ing.name}" could be marked as "preferment" if it's a sourdough starter, or keep as "other" for commercial yeast.`,
        severity: "info",
      });
    }
  });

  return warnings;
}

/**
 * Get validation display color
 */
export function getValidationColor(severity: ValidationWarning["severity"]): string {
  switch (severity) {
    case "error":
      return "text-red-600 dark:text-red-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    case "info":
      return "text-blue-600 dark:text-blue-400";
  }
}

/**
 * Get validation icon
 */
export function getValidationIcon(severity: ValidationWarning["severity"]): string {
  switch (severity) {
    case "error":
      return "⚠️";
    case "warning":
      return "⚠";
    case "info":
      return "ℹ️";
  }
}
