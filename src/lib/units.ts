import type { IngredientRole, UnitSystem } from "@/types/recipes";

/**
 * Measurement-system conversion for imported/displayed recipes.
 *
 * Mass and volume each have a canonical base (grams / millilitres). Units carry
 * a system tag so we only convert when crossing systems. Cross-dimension
 * conversion (volume → mass) is done only when an ingredient density is known,
 * which is exactly what bakers want (cups of flour → grams).
 */

export type { UnitSystem };

type UnitType = "mass" | "volume";
type UnitMeasureSystem = "metric" | "imperial";

interface UnitDef {
  type: UnitType;
  system: UnitMeasureSystem;
  /** Multiplier to the canonical base unit (g for mass, ml for volume). */
  toBase: number;
}

// Canonical, app-normalised unit tokens (see normalize.ts UNIT_ALIASES).
const UNITS: Record<string, UnitDef> = {
  mg: { type: "mass", system: "metric", toBase: 0.001 },
  g: { type: "mass", system: "metric", toBase: 1 },
  kg: { type: "mass", system: "metric", toBase: 1000 },
  oz: { type: "mass", system: "imperial", toBase: 28.3495 },
  lb: { type: "mass", system: "imperial", toBase: 453.592 },
  ml: { type: "volume", system: "metric", toBase: 1 },
  l: { type: "volume", system: "metric", toBase: 1000 },
  tsp: { type: "volume", system: "imperial", toBase: 4.92892 },
  tbsp: { type: "volume", system: "imperial", toBase: 14.7868 },
  "fl oz": { type: "volume", system: "imperial", toBase: 29.5735 },
  cup: { type: "volume", system: "imperial", toBase: 236.588 },
  pint: { type: "volume", system: "imperial", toBase: 473.176 },
  quart: { type: "volume", system: "imperial", toBase: 946.353 },
};

export function isConvertibleUnit(unit: string): boolean {
  return unit in UNITS;
}

// Approximate densities (g per ml) for common baking/cooking ingredients,
// matched by name keyword first, then by ingredient role.
const DENSITY_BY_KEYWORD: Array<{ test: RegExp; gPerMl: number }> = [
  { test: /\bwater\b/i, gPerMl: 1.0 },
  { test: /\b(milk|buttermilk|cream)\b/i, gPerMl: 1.03 },
  { test: /\bhoney|molasses|syrup\b/i, gPerMl: 1.4 },
  { test: /\b(brown sugar)\b/i, gPerMl: 0.93 },
  { test: /\b(powdered|icing|confectioner)/i, gPerMl: 0.56 },
  { test: /\bsugar\b/i, gPerMl: 0.85 },
  { test: /\bcocoa\b/i, gPerMl: 0.41 },
  { test: /\b(flour|starch)\b/i, gPerMl: 0.53 },
  { test: /\b(butter|oil|ghee|shortening|lard)\b/i, gPerMl: 0.91 },
  { test: /\bsalt\b/i, gPerMl: 1.2 },
];

const DENSITY_BY_ROLE: Partial<Record<IngredientRole, number>> = {
  flour: 0.53,
  liquid: 1.0,
  sweetener: 0.85,
  fat: 0.91,
  salt: 1.2,
};

function densityFor(name: string, role?: IngredientRole): number | null {
  for (const { test, gPerMl } of DENSITY_BY_KEYWORD) {
    if (test.test(name)) return gPerMl;
  }
  if (role && DENSITY_BY_ROLE[role] != null) return DENSITY_BY_ROLE[role]!;
  return null;
}

/** Round to a sensible precision for the given unit. */
export function roundForUnit(value: number, unit: string): number {
  switch (unit) {
    case "g":
    case "ml":
      if (value >= 100) return Math.round(value / 5) * 5;
      if (value >= 10) return Math.round(value);
      return Math.round(value * 10) / 10;
    case "kg":
    case "l":
    case "lb":
      return Math.round(value * 100) / 100;
    case "oz":
    case "fl oz":
      return Math.round(value * 10) / 10;
    case "cup":
    case "tbsp":
    case "tsp":
      // Nearest quarter for friendly fractions.
      return Math.round(value * 4) / 4;
    default:
      return Math.round(value * 100) / 100;
  }
}

function pickMetricMass(grams: number): { quantity: number; unit: string } {
  return grams >= 1000
    ? { quantity: roundForUnit(grams / 1000, "kg"), unit: "kg" }
    : { quantity: roundForUnit(grams, "g"), unit: "g" };
}

function pickMetricVolume(ml: number): { quantity: number; unit: string } {
  return ml >= 1000
    ? { quantity: roundForUnit(ml / 1000, "l"), unit: "l" }
    : { quantity: roundForUnit(ml, "ml"), unit: "ml" };
}

function pickImperialMass(grams: number): { quantity: number; unit: string } {
  return grams >= 453.592
    ? { quantity: roundForUnit(grams / 453.592, "lb"), unit: "lb" }
    : { quantity: roundForUnit(grams / 28.3495, "oz"), unit: "oz" };
}

function pickImperialVolume(ml: number): { quantity: number; unit: string } {
  if (ml >= 236.588) return { quantity: roundForUnit(ml / 236.588, "cup"), unit: "cup" };
  if (ml >= 14.7868)
    return { quantity: roundForUnit(ml / 14.7868, "tbsp"), unit: "tbsp" };
  return { quantity: roundForUnit(ml / 4.92892, "tsp"), unit: "tsp" };
}

/**
 * Convert a quantity+unit into the target system, staying within the same
 * dimension (mass↔mass, volume↔volume). Non-convertible or already-in-system
 * values are returned unchanged.
 */
export function convertMeasure(
  quantity: number | null,
  unit: string,
  target: UnitSystem,
): { quantity: number | null; unit: string } {
  if (target === "original" || quantity == null) return { quantity, unit };
  const def = UNITS[unit];
  if (!def || def.system === target) return { quantity, unit };

  const base = quantity * def.toBase;
  if (def.type === "mass") {
    return target === "metric" ? pickMetricMass(base) : pickImperialMass(base);
  }
  return target === "metric" ? pickMetricVolume(base) : pickImperialVolume(base);
}

export interface ConvertibleIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  role?: IngredientRole;
}

/**
 * Convert a single ingredient to the target system. For a metric target we
 * additionally turn known volume ingredients into grams (density-aware), since
 * weight is what bakers actually want.
 */
export function convertIngredient<T extends ConvertibleIngredient>(
  ing: T,
  target: UnitSystem,
): T {
  if (target === "original" || ing.quantity == null) return ing;
  const def = UNITS[ing.unit];
  if (!def) return ing;

  if (target === "metric" && def.type === "volume") {
    const density = densityFor(ing.name, ing.role);
    if (density) {
      const grams = ing.quantity * def.toBase * density;
      const picked = pickMetricMass(grams);
      return { ...ing, quantity: picked.quantity, unit: picked.unit };
    }
  }

  const conv = convertMeasure(ing.quantity, ing.unit, target);
  return { ...ing, quantity: conv.quantity, unit: conv.unit };
}

const FRACTION_LABELS: Array<[number, string]> = [
  [0.25, "¼"],
  [0.5, "½"],
  [0.75, "¾"],
];

/** Render a quantity for display; uses friendly fractions for spoons/cups. */
export function formatAmount(quantity: number | null, unit: string): string {
  if (quantity == null) return "";
  if (unit === "cup" || unit === "tbsp" || unit === "tsp") {
    const whole = Math.floor(quantity);
    const frac = Math.round((quantity - whole) * 4) / 4;
    const label = FRACTION_LABELS.find(([v]) => v === frac)?.[1];
    if (label) return whole > 0 ? `${whole}${label}` : label;
    return String(quantity);
  }
  return String(quantity);
}

export function celsiusToFahrenheit(c: number): number {
  return Math.round((c * 9) / 5 + 32);
}

export function fahrenheitToCelsius(f: number): number {
  return Math.round(((f - 32) * 5) / 9);
}

/** Format a stored Celsius oven temperature for the user's system. */
export function formatOvenTemp(ovenTempC: number, target: UnitSystem): string {
  if (target === "imperial") return `${celsiusToFahrenheit(ovenTempC)}°F`;
  return `${Math.round(ovenTempC)}°C`;
}

/**
 * Rewrite temperatures embedded in free text (step instructions) into the
 * target system, e.g. "bake at 350°F" → "bake at 177°C".
 */
export function convertTemperatureInText(text: string, target: UnitSystem): string {
  if (target === "original") return text;
  const wantF = target === "imperial";

  return text.replace(
    /(\d{2,3})\s*°?\s*(?:degrees?\s*)?([CF])\b/gi,
    (match, numStr: string, unitChar: string) => {
      const value = parseInt(numStr, 10);
      const isF = unitChar.toUpperCase() === "F";
      if (isF === wantF) return match; // already in the desired system
      return wantF
        ? `${celsiusToFahrenheit(value)}°F`
        : `${fahrenheitToCelsius(value)}°C`;
    },
  );
}
