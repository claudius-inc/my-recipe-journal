import type { Ingredient } from "@/types/recipes";

/**
 * Recipe scaling engine.
 *
 * Every scaling method — by an ingredient anchor, by a target total dough
 * weight, or by yield (count x per-unit weight) — reduces to a single
 * dimensionless factor that every ingredient quantity is multiplied by.
 * These helpers are pure so they can be reused and unit-tested independently
 * of the UI.
 */

// Mass units we recognise, mapped to their value in grams. Anything not listed
// (eggs, tsp, ml, "pcs", ...) is treated as a non-mass unit: it still scales by
// the factor, but it cannot contribute to — or be targeted by — a weight total.
const MASS_UNITS: Record<string, number> = {
  g: 1,
  gr: 1,
  gm: 1,
  gram: 1,
  grams: 1,
  kg: 1000,
  kgs: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogram: 1000,
  kilograms: 1000,
};

/** Grams-per-unit for a mass unit, or null if the unit is not mass-based. */
export function unitToGrams(unit: string): number | null {
  return MASS_UNITS[unit.trim().toLowerCase()] ?? null;
}

export function isMassUnit(unit: string): boolean {
  return unitToGrams(unit) !== null;
}

/**
 * Total dough weight in grams, summing only mass-unit ingredients (kg is
 * converted to grams). Non-mass ingredients are ignored because they can't be
 * expressed as a weight.
 */
export function getTotalDoughWeight(ingredients: Ingredient[]): number {
  return ingredients.reduce((sum, ing) => {
    const grams = unitToGrams(ing.unit);
    if (grams == null || ing.quantity == null) {
      return sum;
    }
    return sum + ing.quantity * grams;
  }, 0);
}

/** Ingredients with a quantity that don't contribute to the weight total. */
export function countNonMassIngredients(ingredients: Ingredient[]): number {
  return ingredients.filter((ing) => ing.quantity != null && !isMassUnit(ing.unit))
    .length;
}

export interface ScaledIngredient {
  id: string;
  name: string;
  originalQuantity: number | null;
  newQuantity: number | null;
  unit: string;
}

/** Apply a scale factor to every ingredient, preserving units. */
export function previewScaled(
  ingredients: Ingredient[],
  factor: number,
): ScaledIngredient[] {
  return ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name,
    originalQuantity: ing.quantity,
    newQuantity: ing.quantity != null ? ing.quantity * factor : null,
    unit: ing.unit,
  }));
}

export type ScaleMode = "ingredient" | "weight" | "yield";

export interface ScaleFactorInput {
  mode: ScaleMode;
  ingredients: Ingredient[];
  /** mode "ingredient": the anchor ingredient id and its target amount. */
  anchorId?: string;
  targetAmount?: number;
  /** mode "weight": target total dough weight in grams. */
  targetWeight?: number;
  /** mode "yield": number of units and grams per unit. */
  yieldCount?: number;
  unitWeight?: number;
}

/**
 * Compute the scale factor for a given mode, or null when the inputs can't
 * produce a valid (finite, positive) factor.
 */
export function computeScaleFactor(input: ScaleFactorInput): number | null {
  const factor = rawFactor(input);
  if (factor == null || !Number.isFinite(factor) || factor <= 0) {
    return null;
  }
  return factor;
}

function rawFactor(input: ScaleFactorInput): number | null {
  switch (input.mode) {
    case "ingredient": {
      const anchor = input.ingredients.find((ing) => ing.id === input.anchorId);
      if (!anchor || anchor.quantity == null || anchor.quantity === 0) {
        return null;
      }
      if (input.targetAmount == null) {
        return null;
      }
      return input.targetAmount / anchor.quantity;
    }
    case "weight": {
      const current = getTotalDoughWeight(input.ingredients);
      if (current === 0 || input.targetWeight == null) {
        return null;
      }
      return input.targetWeight / current;
    }
    case "yield": {
      const current = getTotalDoughWeight(input.ingredients);
      if (
        current === 0 ||
        input.yieldCount == null ||
        input.unitWeight == null ||
        input.yieldCount <= 0 ||
        input.unitWeight <= 0
      ) {
        return null;
      }
      return (input.yieldCount * input.unitWeight) / current;
    }
    default:
      return null;
  }
}
