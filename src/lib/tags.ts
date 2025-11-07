// Taste tag library organized by category
export const TASTE_TAG_CATEGORIES = {
  balance: {
    name: "Balance",
    tags: ["Well-balanced", "Complex", "Harmonious", "One-dimensional"],
  },
  intensity: {
    name: "Intensity",
    tags: ["Mild", "Bold", "Intense"],
  },
  flavor: {
    name: "Flavor Profile",
    tags: ["Rich", "Fresh", "Earthy", "Bright", "Deep"],
  },
  character: {
    name: "Character",
    tags: ["Sweet", "Savory", "Tangy", "Buttery", "Toasted"],
  },
};

// Texture tag library (shared across all categories)
export const TEXTURE_TAG_CATEGORIES = {
  structure: {
    name: "Structure",
    tags: [
      "Airy",
      "Dense",
      "Fluffy",
      "Firm",
      "Light and fluffy",
      "Cakey",
      "Fudgy",
      "Crumbly",
      "Flaky",
      "Springy",
    ],
  },
  mouthfeel: {
    name: "Mouthfeel",
    tags: [
      "Chewy",
      "Tender",
      "Crispy",
      "Smooth",
      "Creamy",
      "Velvety",
      "Melts in mouth",
      "Al dente",
    ],
  },
  moisture: {
    name: "Moisture",
    tags: ["Dry", "Perfect moisture", "Moist", "Juicy", "Too moist", "Soggy"],
  },
  crust: {
    name: "Crust/Exterior",
    tags: ["Crispy crust", "Soft crust", "Thin crust", "Thick crust", "Golden crust"],
  },
  crumb: {
    name: "Crumb",
    tags: ["Open crumb", "Tight crumb", "Even crumb", "Irregular crumb"],
  },
  other: {
    name: "Other",
    tags: ["Heavy", "Holds shape", "Crunchy", "Uneven", "Mushy", "Rough"],
  },
};

// Helper function to get all taste tags
export function getAllTasteTags(): string[] {
  return Object.values(TASTE_TAG_CATEGORIES).flatMap((category) => category.tags);
}

// Helper function to get all texture tags
export function getAllTextureTags(): string[] {
  return Object.values(TEXTURE_TAG_CATEGORIES).flatMap((category) => category.tags);
}
