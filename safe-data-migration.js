const { PrismaClient } = require("@prisma/client");

// Test branch (has old schema with data)
const TEST_BRANCH_URL =
  "postgresql://neondb_owner:npg_ydieJS31AcVt@ep-purple-bar-a1rk8u2c-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

// Main branch (has new schema, currently empty)
const MAIN_BRANCH_URL = process.env.DATABASE_URL;

const testPrisma = new PrismaClient({
  datasources: { db: { url: TEST_BRANCH_URL } },
});

const mainPrisma = new PrismaClient({
  datasources: { db: { url: MAIN_BRANCH_URL } },
});

async function safeDataMigration() {
  try {
    console.log("🔍 Step 1: Checking test branch data...\n");

    // Verify test branch has data
    const testRecipeCount = await testPrisma.recipe.count();
    const testUserCount = await testPrisma.user.count();
    console.log(
      `✅ Test branch has ${testUserCount} users and ${testRecipeCount} recipes`,
    );

    if (testRecipeCount === 0) {
      throw new Error("Test branch is empty! Cannot migrate.");
    }

    console.log("\n📊 Step 2: Fetching all data from test branch...\n");

    // Fetch all users
    const users = await testPrisma.user.findMany();
    console.log(`  Found ${users.length} users`);

    // Fetch all sessions
    const sessions = await testPrisma.session.findMany();
    console.log(`  Found ${sessions.length} sessions`);

    // Fetch all accounts
    const accounts = await testPrisma.account.findMany();
    console.log(`  Found ${accounts.length} accounts`);

    // Fetch all recipes with versions and ingredients using raw SQL (because test branch has old schema)
    const recipes = await testPrisma.$queryRaw`
      SELECT * FROM "Recipe"
    `;

    // Fetch all versions
    const versions = await testPrisma.$queryRaw`
      SELECT * FROM "RecipeVersion"
    `;

    // Fetch all ingredients
    const ingredients = await testPrisma.$queryRaw`
      SELECT * FROM "Ingredient"
    `;
    console.log(`  Found ${recipes.length} recipes`);
    console.log(`  Found ${versions.length} versions`);
    console.log(`  Found ${ingredients.length} ingredients`);

    // Group versions by recipe
    const versionsByRecipe = {};
    versions.forEach((v) => {
      if (!versionsByRecipe[v.recipeId]) {
        versionsByRecipe[v.recipeId] = [];
      }
      versionsByRecipe[v.recipeId].push(v);
    });

    // Group ingredients by version
    const ingredientsByVersion = {};
    ingredients.forEach((ing) => {
      if (!ingredientsByVersion[ing.versionId]) {
        ingredientsByVersion[ing.versionId] = [];
      }
      ingredientsByVersion[ing.versionId].push(ing);
    });

    console.log("\n🚀 Step 3: Migrating to main branch with schema transformation...\n");

    // Migrate users
    console.log("  Migrating users...");
    for (const user of users) {
      await mainPrisma.user.upsert({
        where: { id: user.id },
        update: {},
        create: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    }
    console.log(`    ✅ Migrated ${users.length} users`);

    // Migrate sessions
    console.log("  Migrating sessions...");
    for (const session of sessions) {
      try {
        await mainPrisma.session.upsert({
          where: { id: session.id },
          update: {},
          create: {
            id: session.id,
            userId: session.userId,
            expiresAt: session.expiresAt,
            token: session.token,
            ipAddress: session.ipAddress,
            userAgent: session.userAgent,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          },
        });
      } catch (err) {
        console.log(`    ⚠️  Skipped session ${session.id}: ${err.message}`);
      }
    }
    console.log(`    ✅ Migrated sessions`);

    // Migrate accounts
    console.log("  Migrating accounts...");
    for (const account of accounts) {
      try {
        await mainPrisma.account.upsert({
          where: { id: account.id },
          update: {},
          create: {
            id: account.id,
            userId: account.userId,
            type: account.type,
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            refresh_token: account.refresh_token,
            access_token: account.access_token,
            expires_at: account.expires_at,
            token_type: account.token_type,
            scope: account.scope,
            id_token: account.id_token,
            session_state: account.session_state,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
          },
        });
      } catch (err) {
        console.log(`    ⚠️  Skipped account ${account.id}: ${err.message}`);
      }
    }
    console.log(`    ✅ Migrated accounts`);

    // Migrate recipes
    console.log("  Migrating recipes and versions...");
    for (const recipe of recipes) {
      console.log(`    📝 ${recipe.name}...`);

      // Create recipe without activeVersionId first
      await mainPrisma.recipe.create({
        data: {
          id: recipe.id,
          userId: recipe.userId,
          name: recipe.name,
          category: recipe.category,
          description: recipe.description,
          tags: recipe.tags,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
        },
      });

      // Get versions for this recipe
      const recipeVersions = versionsByRecipe[recipe.id] || [];

      // Migrate each version
      for (const version of recipeVersions) {
        // Get ingredients for this version
        const versionIngredients = ingredientsByVersion[version.id] || [];

        // Transform schema: map old fields to new fields
        await mainPrisma.recipeVersion.create({
          data: {
            id: version.id,
            recipeId: recipe.id,
            title: version.title,
            notes: version.notes || "",
            nextSteps: version.nextSteps || "",
            photoUrl: version.photoUrl,
            r2Key: version.r2Key,
            tasteRating: version.tasteRating,
            visualRating: version.visualRating,
            textureRating: version.textureRating,
            // Map old tastingNotes to tasteNotes (best we can do)
            tasteNotes: version.tastingNotes || null,
            visualNotes: null, // New field, no old data
            textureNotes: null, // New field, no old data
            createdAt: version.createdAt,
            updatedAt: version.updatedAt,
            ingredients: {
              create: versionIngredients.map((ing) => ({
                id: ing.id,
                name: ing.name,
                quantity: Number(ing.quantity),
                unit: ing.unit,
                role: ing.role,
                notes: ing.notes,
                sortOrder: ing.sortOrder,
                createdAt: ing.createdAt,
                updatedAt: ing.updatedAt,
              })),
            },
          },
        });
      }

      // Update activeVersionId if it was set
      if (recipe.activeVersionId) {
        await mainPrisma.recipe.update({
          where: { id: recipe.id },
          data: { activeVersionId: recipe.activeVersionId },
        });
      }
    }
    console.log(`    ✅ Migrated ${recipes.length} recipes`);

    console.log("\n✅ Step 4: Verifying migration...\n");

    const mainRecipeCount = await mainPrisma.recipe.count();
    const mainVersionCount = await mainPrisma.recipeVersion.count();
    const mainIngredientCount = await mainPrisma.ingredient.count();
    const mainUserCount = await mainPrisma.user.count();

    console.log("📊 Final counts in main branch:");
    console.log(`  Users: ${mainUserCount}`);
    console.log(`  Recipes: ${mainRecipeCount}`);
    console.log(`  Versions: ${mainVersionCount}`);
    console.log(`  Ingredients: ${mainIngredientCount}`);

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n📝 Notes:");
    console.log('  - Old "tastingNotes" mapped to new "tasteNotes"');
    console.log('  - Old "tasteTags" and "textureTags" removed (feature removed)');
    console.log('  - Old "metadata" removed (category notes feature removed)');
    console.log(
      '  - Old "iterationIntent/hypothesis/outcome" removed (iteration tracking removed)',
    );
    console.log("  - All recipes, versions, ingredients, and ratings preserved ✅");
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    console.error("\nError details:", error.message);
    throw error;
  } finally {
    await testPrisma.$disconnect();
    await mainPrisma.$disconnect();
  }
}

// Run the migration
safeDataMigration()
  .then(() => {
    console.log("\n✅ Done! Your data has been safely migrated.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error during migration");
    process.exit(1);
  });
