import { describe, it, expect } from "vitest";
import {
  convertMeasure,
  convertIngredient,
  formatAmount,
  formatOvenTemp,
  convertTemperatureInText,
  fahrenheitToCelsius,
} from "./units";

describe("convertMeasure", () => {
  it("leaves original target untouched", () => {
    expect(convertMeasure(8, "oz", "original")).toEqual({ quantity: 8, unit: "oz" });
  });
  it("leaves already-in-system values untouched", () => {
    expect(convertMeasure(200, "g", "metric")).toEqual({ quantity: 200, unit: "g" });
  });
  it("converts imperial mass to metric (grams rounded to nearest 5)", () => {
    expect(convertMeasure(1, "lb", "metric")).toEqual({ quantity: 455, unit: "g" });
    expect(convertMeasure(16, "oz", "metric").unit).toBe("g");
  });
  it("converts metric mass to imperial", () => {
    const r = convertMeasure(1000, "g", "imperial");
    expect(r.unit).toBe("lb");
    expect(r.quantity).toBeCloseTo(2.2, 1);
  });
  it("converts metric volume to imperial spoons/cups", () => {
    expect(convertMeasure(240, "ml", "imperial").unit).toBe("cup");
    expect(convertMeasure(15, "ml", "imperial").unit).toBe("tbsp");
  });
  it("does not touch non-convertible units", () => {
    expect(convertMeasure(2, "each", "metric")).toEqual({ quantity: 2, unit: "each" });
    expect(convertMeasure(null, "g", "imperial")).toEqual({ quantity: null, unit: "g" });
  });
});

describe("convertIngredient (density-aware)", () => {
  it("turns cups of flour into grams for metric", () => {
    const out = convertIngredient(
      { name: "Bread flour", quantity: 1, unit: "cup", role: "flour" },
      "metric",
    );
    expect(out.unit).toBe("g");
    // 236.588 ml * 0.53 ≈ 125 g
    expect(out.quantity).toBeGreaterThan(110);
    expect(out.quantity).toBeLessThan(140);
  });
  it("turns cups of water into grams (~237) for metric", () => {
    const out = convertIngredient(
      { name: "Water", quantity: 1, unit: "cup", role: "liquid" },
      "metric",
    );
    expect(out.unit).toBe("g");
    expect(out.quantity).toBeGreaterThan(220);
  });
  it("falls back to volume conversion when density is unknown", () => {
    const out = convertIngredient(
      { name: "Mystery liquid", quantity: 1, unit: "cup" },
      "metric",
    );
    expect(out.unit).toBe("ml");
  });
});

describe("formatAmount", () => {
  it("renders quarter fractions for spoons/cups", () => {
    expect(formatAmount(0.5, "cup")).toBe("½");
    expect(formatAmount(1.25, "tbsp")).toBe("1¼");
    expect(formatAmount(2, "tsp")).toBe("2");
  });
  it("renders plain numbers for mass", () => {
    expect(formatAmount(250, "g")).toBe("250");
  });
});

describe("temperature", () => {
  it("formats oven temp per system", () => {
    expect(formatOvenTemp(180, "metric")).toBe("180°C");
    expect(formatOvenTemp(180, "imperial")).toBe("356°F");
  });
  it("rewrites temperatures embedded in text", () => {
    expect(convertTemperatureInText("Bake at 350°F for 30 min", "metric")).toBe(
      "Bake at 177°C for 30 min",
    );
    expect(convertTemperatureInText("Bake at 180°C", "imperial")).toBe("Bake at 356°F");
    expect(convertTemperatureInText("Bake at 180°C", "metric")).toBe("Bake at 180°C");
  });
  it("converts F to C", () => {
    expect(fahrenheitToCelsius(350)).toBe(177);
  });
});
