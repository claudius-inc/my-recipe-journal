/**
 * Migration script to convert legacy flat categories to hierarchical categories
 *
 * Run with: npx tsx scripts/migrate-categories.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Migration mapping rules
const MIGRATION_RULES: Record<
  string,
  {
    primary: string;
    secondary: string;
    keywords?: Array<{ pattern: RegExp; secondary: string }>;
  }
> = {
  bread: {
    primary: "baking",
    secondary: "bread",
  },
  dessert: {
    primary: "baking",
    secondary: "cookies", // default, will be refined by keywords
    keywords: [
      { pattern: /cookie/i, secondary: "cookies" },
      { pattern: /cake/i, secondary: "cakes" },
      { pattern: /pie|tart/i, secondary: "pies" },
      { pattern: /pastry|croissant|danish|puff/i, secondary: "pastries" },
      { pattern: /sourdough/i, secondary: "sourdough" },
    ],
  },
  drink: {
    primary: "beverages",
    secondary: "coffee", // default
    keywords: [
      { pattern: /coffee|espresso|latte|cappuccino/i, secondary: "coffee" },
      { pattern: /tea/i, secondary: "tea" },
      { pattern: /cocktail|drink|martini|mojito/i, secondary: "cocktail" },
      { pattern: /smoothie/i, secondary: "smoothie" },
      { pattern: /kombucha|kefir|ferment/i, secondary: "fermented" },
    ],
  },
  main: {
    primary: "cooking",
    secondary: "main_dish",
  },
  sauce: {
    primary: "cooking",
    secondary: "sauce",
  },
  other: {
    primary: "other",
    secondary: "other",
  },
};

function determineSecondaryCategory(legacyCategory: string, recipeName: string): string {
  const rule = MIGRATION_RULES[legacyCategory];
  if (!rule) {
    return "other";
  }

  // Check if there are keyword-based rules
  if (rule.keywords && Array.isArray(rule.keywords)) {
    for (const { pattern, secondary } of rule.keywords) {
      if (pattern.test(recipeName)) {
        return secondary;
      }
    }
  }

  return rule.secondary;
}

async function migrateCategories() {
  console.log("🚀 Starting category migration...\n");

  try {
    // Fetch all recipes
    const recipes = await prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        primaryCategory: true,
        secondaryCategory: true,
      },
    });

    console.log(`📊 Found ${recipes.length} recipes to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const recipe of recipes) {
      // Skip if already migrated
      if (recipe.primaryCategory && recipe.secondaryCategory) {
        console.log(
          `⏭️  Skipping "${recipe.name}" - already has hierarchical categories`,
        );
        skipped++;
        continue;
      }

      const legacyCategory = recipe.category;
      const rule = MIGRATION_RULES[legacyCategory];

      if (!rule) {
        console.error(`❌ No migration rule for category: ${legacyCategory}`);
        errors++;
        continue;
      }

      const primaryCategory = rule.primary;
      const secondaryCategory = determineSecondaryCategory(legacyCategory, recipe.name);

      try {
        await prisma.recipe.update({
          where: { id: recipe.id },
          data: {
            primaryCategory: primaryCategory as any,
            secondaryCategory: secondaryCategory as any,
          },
        });

        console.log(
          `✅ Migrated "${recipe.name}": ${legacyCategory} → ${primaryCategory}:${secondaryCategory}`,
        );
        migrated++;
      } catch (error) {
        console.error(`❌ Failed to migrate "${recipe.name}":`, error);
        errors++;
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total: ${recipes.length}`);

    if (errors === 0) {
      console.log(`\n🎉 Migration completed successfully!`);
    } else {
      console.log(`\n⚠️  Migration completed with ${errors} errors`);
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateCategories()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
