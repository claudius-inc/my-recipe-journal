import {
  INGREDIENT_ROLES,
  CATEGORY_HIERARCHY,
  type IngredientRole,
  type RecipeCategory,
  type PrimaryCategoryKey,
  type SecondaryCategoryKey,
} from "@/types/recipes";
import { suggestIngredientDefaults } from "@/lib/ingredient-helpers";

/**
 * Shared sanitiser for AI / scraper output.
 *
 * Importers and AI extraction are best-effort: roles drift outside the allowed
 * set, units come back in a dozen spellings, quantities arrive as strings, and
 * categories occasionally use the legacy flat enum. Everything funnels through
 * here so the rest of the app only ever sees valid, canonical values.
 */

export interface RawIngredient {
  name?: unknown;
  quantity?: unknown;
  unit?: unknown;
  role?: unknown;
  notes?: unknown;
}

export interface NormalizedIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

// Canonical unit aliases. Lower-cased on lookup; unknown units pass through
// untouched (trimmed) so we never silently drop information.
const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gr: "g",
  gm: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kgs: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  mg: "mg",
  milligram: "mg",
  milligrams: "mg",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  cc: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tbs: "tbsp",
  tbl: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  "fl oz": "fl oz",
  floz: "fl oz",
  "fluid ounce": "fl oz",
  "fluid ounces": "fl oz",
  pint: "pint",
  pints: "pint",
  quart: "quart",
  quarts: "quart",
  pinch: "pinch",
  pinches: "pinch",
  each: "each",
  pc: "each",
  pcs: "each",
  piece: "each",
  pieces: "each",
  whole: "each",
  clove: "clove",
  cloves: "clove",
  "to taste": "to taste",
};

/** Map a free-form unit string to a canonical token (defaults to grams). */
export function normalizeUnit(raw: unknown): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return "g";
  return UNIT_ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

/** Keep a valid role, otherwise infer one from the ingredient name. */
export function normalizeRole(name: string, role: unknown): IngredientRole {
  if (typeof role === "string" && INGREDIENT_ROLES.includes(role as IngredientRole)) {
    return role as IngredientRole;
  }
  return suggestIngredientDefaults(name)?.role ?? "other";
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}

/** Clean a single ingredient, or return null if it has no usable name. */
export function normalizeIngredient(raw: RawIngredient): NormalizedIngredient | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;

  const unit = normalizeUnit(raw.unit);
  let quantity = toNumberOrNull(raw.quantity);
  // "to taste" items carry no numeric quantity; some sources encode this as 0.
  if (unit === "to taste") quantity = null;

  const notes =
    typeof raw.notes === "string" && raw.notes.trim() ? raw.notes.trim() : undefined;

  return { name, quantity, unit, role: normalizeRole(name, raw.role), notes };
}

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 0.5,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 0.25,
  "¾": 0.75,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

// Parse a leading amount: integers, decimals, "1 1/2", "3/4", "1½", ranges
// ("1-2", "1 to 2" → take the lower bound). Returns the value and remainder.
function parseLeadingQuantity(input: string): { quantity: number | null; rest: string } {
  const s = input.trimStart();
  let m = s.match(/^(\d+)?\s*([½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])/);
  if (m) {
    const whole = m[1] ? parseInt(m[1], 10) : 0;
    return {
      quantity: whole + UNICODE_FRACTIONS[m[2]],
      rest: s.slice(m[0].length).trim(),
    };
  }
  m = s.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (m) {
    return {
      quantity: parseInt(m[1], 10) + parseInt(m[2], 10) / parseInt(m[3], 10),
      rest: s.slice(m[0].length).trim(),
    };
  }
  m = s.match(/^(\d+)\/(\d+)/);
  if (m) {
    return {
      quantity: parseInt(m[1], 10) / parseInt(m[2], 10),
      rest: s.slice(m[0].length).trim(),
    };
  }
  m = s.match(/^(\d+(?:\.\d+)?)\s*(?:[-–—]|to)\s*(\d+(?:\.\d+)?)/);
  if (m) {
    return { quantity: parseFloat(m[1]), rest: s.slice(m[0].length).trim() };
  }
  m = s.match(/^(\d+(?:\.\d+)?)/);
  if (m) {
    return { quantity: parseFloat(m[1]), rest: s.slice(m[0].length).trim() };
  }
  return { quantity: null, rest: s };
}

/**
 * Parse a free-text ingredient line ("200 g bread flour", "1½ cups sugar",
 * "salt to taste") into quantity / unit / name. Units and roles are still
 * passed through normalizeIngredient afterwards for final canonicalisation.
 */
export function parseIngredientText(line: string): {
  name: string;
  quantity: number | null;
  unit: string;
} {
  const raw = line.trim().replace(/\s+/g, " ");
  if (!raw) return { name: "", quantity: null, unit: "" };

  const toTaste = /\b(to taste|as needed)\b/i.test(raw);
  const { quantity, rest } = parseLeadingQuantity(raw);

  const words = rest.split(" ");
  const two = words.slice(0, 2).join(" ").toLowerCase();
  const one = (words[0] ?? "").toLowerCase().replace(/\.$/, "");

  let unit = "";
  let name = rest;
  if (UNIT_ALIASES[two]) {
    unit = UNIT_ALIASES[two];
    name = words.slice(2).join(" ");
  } else if (UNIT_ALIASES[one]) {
    unit = UNIT_ALIASES[one];
    name = words.slice(1).join(" ");
  }

  name = name.replace(/^of\s+/i, "").trim();

  if (toTaste) {
    const cleaned = name.replace(/,?\s*(to taste|as needed)\b/i, "").trim();
    return { name: cleaned || name, quantity: null, unit: unit || "to taste" };
  }

  return { name, quantity, unit };
}

// Legacy flat category enum → hierarchical category.
const LEGACY_CATEGORY_MAP: Record<string, RecipeCategory> = {
  bread: { primary: "baking", secondary: "bread" },
  dessert: { primary: "baking", secondary: "cakes" },
  drink: { primary: "beverages", secondary: "coffee" },
  main: { primary: "cooking", secondary: "main_dish" },
  sauce: { primary: "cooking", secondary: "sauce" },
  other: { primary: "other", secondary: "other" },
};

/** Coerce any category shape into a valid hierarchical category. */
export function normalizeCategory(raw: unknown): RecipeCategory {
  if (typeof raw === "string") {
    return (
      LEGACY_CATEGORY_MAP[raw.toLowerCase()] ?? { primary: "other", secondary: "other" }
    );
  }
  if (raw && typeof raw === "object") {
    const primary = (raw as { primary?: unknown }).primary as PrimaryCategoryKey;
    const secondary = (raw as { secondary?: unknown }).secondary as SecondaryCategoryKey;
    const validSecondaries = CATEGORY_HIERARCHY[primary];
    if (validSecondaries) {
      return {
        primary,
        secondary: validSecondaries.includes(secondary) ? secondary : validSecondaries[0],
      };
    }
  }
  return { primary: "other", secondary: "other" };
}

export interface RawExtractedRecipe {
  name?: unknown;
  category?: unknown;
  description?: unknown;
  ingredients?: RawIngredient[];
  ingredientGroups?: Array<{ name?: unknown; ingredients?: RawIngredient[] }>;
}

function cleanIngredientList(list: unknown): NormalizedIngredient[] {
  return (Array.isArray(list) ? list : [])
    .map((i) => normalizeIngredient(i as RawIngredient))
    .filter((i): i is NormalizedIngredient => i !== null);
}

/**
 * Normalise a full extracted recipe: valid category, clean ingredient groups
 * with a guaranteed flat `ingredients` mirror, trimmed name/description. Extra
 * fields (steps, servings, metadata, imageUrl, sourceUrl…) pass through.
 */
export function normalizeExtractedRecipe<T extends RawExtractedRecipe>(
  data: T,
): Omit<T, "name" | "category" | "ingredients" | "ingredientGroups"> & {
  name: string;
  category: RecipeCategory;
  ingredients: NormalizedIngredient[];
  ingredientGroups?: Array<{ name: string; ingredients: NormalizedIngredient[] }>;
} {
  const groups = Array.isArray(data.ingredientGroups)
    ? data.ingredientGroups
        .map((g) => ({
          name:
            typeof g.name === "string" && g.name.trim() ? g.name.trim() : "Ingredients",
          ingredients: cleanIngredientList(g.ingredients),
        }))
        .filter((g) => g.ingredients.length > 0)
    : undefined;

  const flat = cleanIngredientList(data.ingredients);
  const ingredients =
    flat.length > 0 ? flat : groups ? groups.flatMap((g) => g.ingredients) : [];

  return {
    ...data,
    name: typeof data.name === "string" ? data.name.trim() : "",
    category: normalizeCategory(data.category),
    description:
      typeof data.description === "string"
        ? data.description.trim() || undefined
        : undefined,
    ingredients,
    ingredientGroups: groups && groups.length > 0 ? groups : undefined,
  };
}
