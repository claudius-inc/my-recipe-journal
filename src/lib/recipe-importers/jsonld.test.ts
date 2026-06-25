import { describe, it, expect } from "vitest";
import { extractRecipeFromJsonLd } from "./jsonld";

const wrap = (json: object) =>
  `<html><head><script type="application/ld+json">${JSON.stringify(
    json,
  )}</script></head><body></body></html>`;

describe("extractRecipeFromJsonLd", () => {
  it("extracts a flat Recipe node", () => {
    const html = wrap({
      "@context": "https://schema.org",
      "@type": "Recipe",
      name: "Test Bread",
      description: "A loaf",
      recipeCategory: "Bread",
      recipeYield: "8 servings",
      prepTime: "PT20M",
      cookTime: "PT1H",
      recipeIngredient: ["500 g bread flour", "350 ml water", "10 g salt"],
      recipeInstructions: [
        { "@type": "HowToStep", text: "Mix" },
        { "@type": "HowToStep", text: "Bake" },
      ],
      image: ["https://example.com/loaf.jpg"],
    });
    const r = extractRecipeFromJsonLd(html);
    expect(r).not.toBeNull();
    expect(r?.name).toBe("Test Bread");
    expect(r?.category).toEqual({ primary: "baking", secondary: "bread" });
    expect(r?.servings).toBe(8);
    expect(r?.prepTime).toBe("20 min");
    expect(r?.cookTime).toBe("1 hr");
    expect(r?.ingredients).toHaveLength(3);
    expect(r?.ingredients[0]).toMatchObject({
      name: "bread flour",
      quantity: 500,
      unit: "g",
      role: "flour",
    });
    expect(r?.steps).toHaveLength(2);
    expect(r?.imageUrl).toBe("https://example.com/loaf.jpg");
  });

  it("finds a Recipe inside an @graph", () => {
    const html = wrap({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", name: "Site" },
        {
          "@type": ["Recipe", "Thing"],
          name: "Graph Cake",
          recipeIngredient: ["2 cups sugar"],
          recipeInstructions: "Step one\nStep two",
        },
      ],
    });
    const r = extractRecipeFromJsonLd(html);
    expect(r?.name).toBe("Graph Cake");
    expect(r?.category).toEqual({ primary: "baking", secondary: "cakes" });
    expect(r?.steps).toHaveLength(2);
  });

  it("returns null when there is no Recipe node", () => {
    expect(extractRecipeFromJsonLd(wrap({ "@type": "Article" }))).toBeNull();
  });

  it("returns null on malformed JSON-LD", () => {
    const html = `<script type="application/ld+json">{ not json }</script>`;
    expect(extractRecipeFromJsonLd(html)).toBeNull();
  });
});
