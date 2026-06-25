import { describe, it, expect } from "vitest";
import {
  normalizeUnit,
  normalizeRole,
  normalizeIngredient,
  normalizeCategory,
  normalizeExtractedRecipe,
} from "./normalize";

describe("normalizeUnit", () => {
  it("canonicalises common spellings", () => {
    expect(normalizeUnit("grams")).toBe("g");
    expect(normalizeUnit("Tablespoon")).toBe("tbsp");
    expect(normalizeUnit("CUPS")).toBe("cup");
    expect(normalizeUnit("fluid ounces")).toBe("fl oz");
  });
  it("defaults blank to grams and passes unknown through", () => {
    expect(normalizeUnit("")).toBe("g");
    expect(normalizeUnit(undefined)).toBe("g");
    expect(normalizeUnit("sprig")).toBe("sprig");
  });
});

describe("normalizeRole", () => {
  it("keeps valid roles", () => {
    expect(normalizeRole("anything", "fat")).toBe("fat");
  });
  it("infers role from name when invalid/missing", () => {
    expect(normalizeRole("Bread flour", "bogus")).toBe("flour");
    expect(normalizeRole("Water", undefined)).toBe("liquid");
    expect(normalizeRole("Mystery powder", null)).toBe("other");
  });
});

describe("normalizeIngredient", () => {
  it("coerces string quantities to numbers", () => {
    expect(normalizeIngredient({ name: "Sugar", quantity: "200", unit: "g" })).toEqual({
      name: "Sugar",
      quantity: 200,
      unit: "g",
      role: "sweetener",
      notes: undefined,
    });
  });
  it("nulls quantity for 'to taste'", () => {
    const out = normalizeIngredient({ name: "Salt", quantity: 0, unit: "to taste" });
    expect(out?.quantity).toBeNull();
    expect(out?.unit).toBe("to taste");
  });
  it("drops ingredients without a name", () => {
    expect(normalizeIngredient({ quantity: 1, unit: "g" })).toBeNull();
  });
});

describe("normalizeCategory", () => {
  it("maps legacy flat strings", () => {
    expect(normalizeCategory("bread")).toEqual({ primary: "baking", secondary: "bread" });
    expect(normalizeCategory("main")).toEqual({
      primary: "cooking",
      secondary: "main_dish",
    });
  });
  it("repairs an invalid secondary within a valid primary", () => {
    expect(normalizeCategory({ primary: "baking", secondary: "main_dish" })).toEqual({
      primary: "baking",
      secondary: "bread",
    });
  });
  it("falls back to other/other for garbage", () => {
    expect(normalizeCategory({ primary: "nope" })).toEqual({
      primary: "other",
      secondary: "other",
    });
    expect(normalizeCategory(42)).toEqual({ primary: "other", secondary: "other" });
  });
});

describe("normalizeExtractedRecipe", () => {
  it("cleans groups and mirrors a flat ingredient list", () => {
    const out = normalizeExtractedRecipe({
      name: "  Test Loaf ",
      category: "bread",
      ingredientGroups: [
        {
          name: " Dough ",
          ingredients: [
            { name: "Bread flour", quantity: "500", unit: "grams", role: "x" },
            { name: "", quantity: 1, unit: "g" },
          ],
        },
        { name: "Empty", ingredients: [] },
      ],
      servings: 8,
    });
    expect(out.name).toBe("Test Loaf");
    expect(out.category).toEqual({ primary: "baking", secondary: "bread" });
    expect(out.ingredientGroups).toHaveLength(1);
    expect(out.ingredientGroups?.[0]).toMatchObject({ name: "Dough" });
    expect(out.ingredients).toHaveLength(1);
    expect(out.ingredients[0]).toMatchObject({ unit: "g", role: "flour" });
    // passthrough field preserved
    expect((out as { servings?: number }).servings).toBe(8);
  });

  it("uses the flat list when no groups are present", () => {
    const out = normalizeExtractedRecipe({
      name: "Flat",
      category: { primary: "cooking", secondary: "sauce" },
      ingredients: [{ name: "Tomato", quantity: 3, unit: "each" }],
    });
    expect(out.ingredientGroups).toBeUndefined();
    expect(out.ingredients).toHaveLength(1);
  });
});
