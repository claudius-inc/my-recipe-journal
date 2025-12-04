// Run with: npx tsx scripts/migrate-ingredients-to-groups.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting migration: Adding groups to versions with ingredients...\n");

  // Find all versions that have ingredients but no groups
  const versionsToMigrate = await prisma.recipeVersion.findMany({
    where: {
      ingredients: {
        some: {
          groupId: null, // Ingredients without a group
        },
      },
    },
    include: {
      ingredients: {
        where: {
          groupId: null,
        },
      },
      recipe: {
        select: {
          id: true,
          name: true,
          primaryCategory: true,
          secondaryCategory: true,
        },
      },
    },
  });

  console.log(`Found ${versionsToMigrate.length} version(s) needing migration.\n`);

  for (const version of versionsToMigrate) {
    console.log(`Processing: "${version.recipe.name}" (version: ${version.id})`);
    console.log(`  - ${version.ingredients.length} ingredient(s) without group`);

    // Determine if baker's percentage should be enabled
    const isBaking =
      version.recipe.primaryCategory === "baking" &&
      ["bread", "sourdough", "cookies", "cakes", "pastries", "pies"].includes(
        version.recipe.secondaryCategory ?? "",
      );

    // Create a new group for this version
    const group = await prisma.ingredientGroup.create({
      data: {
        versionId: version.id,
        name: "Ingredients",
        orderIndex: 0,
        enableBakersPercent: isBaking,
      },
    });

    console.log(`  - Created group: ${group.id} (enableBakersPercent: ${isBaking})`);

    // Update all ingredients in this version to use the new group
    const updateResult = await prisma.ingredient.updateMany({
      where: {
        versionId: version.id,
        groupId: null,
      },
      data: {
        groupId: group.id,
      },
    });

    console.log(`  - Updated ${updateResult.count} ingredient(s) to use the new group\n`);
  }

  console.log("Migration complete!");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
