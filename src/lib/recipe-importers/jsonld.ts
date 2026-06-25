import * as cheerio from "cheerio";
import type { IngredientRole, RecipeCategory } from "@/types/recipes";
import { suggestIngredientDefaults } from "@/lib/ingredient-helpers";
import { parseIngredientText } from "./normalize";

/**
 * schema.org/Recipe JSON-LD extraction.
 *
 * Most recipe sites publish a machine-readable Recipe object in a
 * <script type="application/ld+json"> tag. Parsing it is far more reliable
 * (and free) than sending raw HTML to an LLM, so the generic URL importer
 * tries this first and only falls back to Gemini when it's absent.
 */

export interface JsonLdRecipe {
  name?: string;
  description?: string;
  category: RecipeCategory;
  ingredients: Array<{
    name: string;
    quantity: number | null;
    unit: string;
    role: IngredientRole;
  }>;
  steps: Array<{ order: number; text: string }>;
  servings?: number;
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  imageUrl?: string;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function firstString(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = firstString(v);
      if (s) return s;
    }
  }
  return undefined;
}

// ISO 8601 duration ("PT1H30M") → human ("1 hr 30 min").
function parseIsoDuration(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const m = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/);
  if (!m) return undefined;
  const [, days, hours, mins] = m;
  const parts: string[] = [];
  if (days) parts.push(`${days} day${Number(days) > 1 ? "s" : ""}`);
  if (hours) parts.push(`${hours} hr`);
  if (mins) parts.push(`${mins} min`);
  return parts.length ? parts.join(" ") : undefined;
}

function extractServings(value: unknown): number | undefined {
  const s = firstString(value) ?? (typeof value === "number" ? String(value) : undefined);
  if (!s) return undefined;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : undefined;
}

function extractImage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const v of value) {
      const s = extractImage(v);
      if (s) return s;
    }
    return undefined;
  }
  if (value && typeof value === "object") {
    const url = (value as { url?: unknown }).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

// recipeInstructions: string | string[] | HowToStep[] | HowToSection[].
function extractSteps(value: unknown): Array<{ order: number; text: string }> {
  const steps: string[] = [];
  const visit = (node: unknown) => {
    if (!node) return;
    if (typeof node === "string") {
      node
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((s) => steps.push(s));
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "object") {
      const obj = node as { "@type"?: string; text?: unknown; itemListElement?: unknown };
      if (obj.itemListElement) {
        visit(obj.itemListElement);
        return;
      }
      const text = firstString(obj.text);
      if (text) steps.push(text);
    }
  };
  visit(value);
  return steps.map((text, i) => ({ order: i + 1, text }));
}

const CATEGORY_KEYWORDS: Array<{ test: RegExp; category: RecipeCategory }> = [
  { test: /sourdough/i, category: { primary: "baking", secondary: "sourdough" } },
  {
    test: /bread|loaf|bun|bagel|roll/i,
    category: { primary: "baking", secondary: "bread" },
  },
  { test: /cookie|biscuit/i, category: { primary: "baking", secondary: "cookies" } },
  { test: /cake|muffin|cupcake/i, category: { primary: "baking", secondary: "cakes" } },
  {
    test: /pastry|croissant|danish/i,
    category: { primary: "baking", secondary: "pastries" },
  },
  { test: /\bpie\b|tart|quiche/i, category: { primary: "baking", secondary: "pies" } },
  { test: /sauce|gravy|dressing/i, category: { primary: "cooking", secondary: "sauce" } },
  {
    test: /appetizer|starter/i,
    category: { primary: "cooking", secondary: "appetizer" },
  },
  { test: /side dish/i, category: { primary: "cooking", secondary: "side_dish" } },
  { test: /cocktail/i, category: { primary: "beverages", secondary: "cocktail" } },
  { test: /smoothie/i, category: { primary: "beverages", secondary: "smoothie" } },
  {
    test: /coffee|latte|espresso/i,
    category: { primary: "beverages", secondary: "coffee" },
  },
  { test: /\btea\b/i, category: { primary: "beverages", secondary: "tea" } },
  {
    test: /drink|beverage|juice/i,
    category: { primary: "beverages", secondary: "coffee" },
  },
  {
    test: /main|dinner|entree|entrée|lunch/i,
    category: { primary: "cooking", secondary: "main_dish" },
  },
];

// Best-effort category from the recipe's category text + name.
function inferCategory(text: string): RecipeCategory {
  for (const { test, category } of CATEGORY_KEYWORDS) {
    if (test.test(text)) return category;
  }
  return { primary: "cooking", secondary: "main_dish" };
}

type LdNode = Record<string, unknown>;

function isRecipeNode(node: LdNode): boolean {
  const type = node["@type"];
  return asArray(type as string | string[]).some((t) => t === "Recipe");
}

// Flatten arrays and @graph wrappers into a flat list of nodes.
function collectNodes(parsed: unknown, out: LdNode[]): void {
  for (const node of asArray(parsed as LdNode | LdNode[])) {
    if (!node || typeof node !== "object") continue;
    out.push(node);
    const graph = (node as LdNode)["@graph"];
    if (graph) collectNodes(graph, out);
  }
}

export function extractRecipeFromJsonLd(html: string): JsonLdRecipe | null {
  let $: ReturnType<typeof cheerio.load>;
  try {
    $ = cheerio.load(html);
  } catch {
    return null;
  }

  const nodes: LdNode[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text() || $(el).text();
    if (!raw.trim()) return;
    try {
      collectNodes(JSON.parse(raw), nodes);
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  const recipe = nodes.find(isRecipeNode);
  if (!recipe) return null;

  const ingredients = asArray(recipe.recipeIngredient as string | string[])
    .map((line) => (typeof line === "string" ? line : ""))
    .map((line) => parseIngredientText(line))
    .filter((ing) => ing.name)
    .map((ing) => ({
      ...ing,
      role: (suggestIngredientDefaults(ing.name)?.role ?? "other") as IngredientRole,
    }));

  if (ingredients.length === 0) return null;

  const name = firstString(recipe.name);
  const categoryText = `${firstString(recipe.recipeCategory) ?? ""} ${name ?? ""}`;

  return {
    name,
    description: firstString(recipe.description),
    category: inferCategory(categoryText),
    ingredients,
    steps: extractSteps(recipe.recipeInstructions),
    servings: extractServings(recipe.recipeYield),
    prepTime: parseIsoDuration(recipe.prepTime),
    cookTime: parseIsoDuration(recipe.cookTime),
    totalTime: parseIsoDuration(recipe.totalTime),
    imageUrl: extractImage(recipe.image),
  };
}
