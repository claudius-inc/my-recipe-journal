/**
 * Migration script: Neon (PostgreSQL) → Turso (SQLite)
 * 
 * Usage: npx tsx scripts/migrate-to-turso.ts
 * 
 * Prerequisites:
 * 1. Set both database credentials in .env:
 *    - DATABASE_URL (Neon - source)
 *    - TURSO_DATABASE_URL (Turso - destination)
 *    - TURSO_AUTH_TOKEN
 * 2. Run `npm run db:push` first to create Turso tables
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

// Source: Neon (Prisma)
const prisma = new PrismaClient();

// Destination: Turso (Drizzle)
const tursoClient = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(tursoClient, { schema });

async function migrate() {
  console.log("🚀 Starting migration from Neon to Turso...\n");

  try {
    // 1. Migrate Users
    console.log("📦 Migrating users...");
    const users = await prisma.user.findMany();
    if (users.length) {
      for (const user of users) {
        await db.insert(schema.users).values({
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${users.length} users`);
    }

    // 2. Migrate Sessions
    console.log("📦 Migrating sessions...");
    const sessions = await prisma.session.findMany();
    if (sessions.length) {
      for (const session of sessions) {
        await db.insert(schema.sessions).values({
          id: session.id,
          userId: session.userId,
          expiresAt: session.expiresAt,
          token: session.token,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${sessions.length} sessions`);
    }

    // 3. Migrate Accounts
    console.log("📦 Migrating accounts...");
    const accounts = await prisma.account.findMany();
    if (accounts.length) {
      for (const account of accounts) {
        await db.insert(schema.accounts).values({
          id: account.id,
          userId: account.userId,
          type: account.type,
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          refreshToken: account.refresh_token,
          accessToken: account.access_token,
          expiresAt: account.expires_at,
          tokenType: account.token_type,
          scope: account.scope,
          idToken: account.id_token,
          sessionState: account.session_state,
          createdAt: account.createdAt,
          updatedAt: account.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${accounts.length} accounts`);
    }

    // 4. Migrate Verifications
    console.log("📦 Migrating verifications...");
    const verifications = await prisma.verification.findMany();
    if (verifications.length) {
      for (const v of verifications) {
        await db.insert(schema.verifications).values({
          id: v.id,
          identifier: v.identifier,
          value: v.value,
          expiresAt: v.expiresAt,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${verifications.length} verifications`);
    }

    // 5. Migrate Recipes (without activeVersionId first to avoid FK issues)
    console.log("📦 Migrating recipes...");
    const recipes = await prisma.recipe.findMany();
    if (recipes.length) {
      for (const recipe of recipes) {
        await db.insert(schema.recipes).values({
          id: recipe.id,
          userId: recipe.userId,
          name: recipe.name,
          category: recipe.category as schema.RecipeCategory,
          primaryCategory: recipe.primaryCategory as schema.PrimaryCategory | null,
          secondaryCategory: recipe.secondaryCategory as schema.SecondaryCategory | null,
          description: recipe.description,
          tags: recipe.tags as string[] | null,
          createdAt: recipe.createdAt,
          updatedAt: recipe.updatedAt,
          archivedAt: recipe.archivedAt,
          pinnedAt: recipe.pinnedAt,
          activeVersionId: null, // Will update after versions are migrated
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${recipes.length} recipes`);
    }

    // 6. Migrate Recipe Versions
    console.log("📦 Migrating recipe versions...");
    const versions = await prisma.recipeVersion.findMany();
    if (versions.length) {
      for (const v of versions) {
        await db.insert(schema.recipeVersions).values({
          id: v.id,
          recipeId: v.recipeId,
          title: v.title,
          steps: v.steps as unknown[],
          notes: v.notes,
          nextSteps: v.nextSteps,
          photoUrl: v.photoUrl,
          r2Key: v.r2Key,
          tasteRating: v.tasteRating,
          visualRating: v.visualRating,
          textureRating: v.textureRating,
          tasteNotes: v.tasteNotes,
          visualNotes: v.visualNotes,
          textureNotes: v.textureNotes,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${versions.length} recipe versions`);
    }

    // 7. Update activeVersionId on recipes
    console.log("📦 Updating activeVersionId references...");
    const recipesWithActiveVersion = recipes.filter(r => r.activeVersionId);
    for (const recipe of recipesWithActiveVersion) {
      await db.update(schema.recipes)
        .set({ activeVersionId: recipe.activeVersionId })
        .where(eq(schema.recipes.id, recipe.id));
    }
    console.log(`   ✅ Updated ${recipesWithActiveVersion.length} active version references`);

    // 8. Migrate Version Photos
    console.log("📦 Migrating version photos...");
    const photos = await prisma.versionPhoto.findMany();
    if (photos.length) {
      for (const photo of photos) {
        await db.insert(schema.versionPhotos).values({
          id: photo.id,
          versionId: photo.versionId,
          photoUrl: photo.photoUrl,
          r2Key: photo.r2Key,
          order: photo.order,
          createdAt: photo.createdAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${photos.length} version photos`);
    }

    // 9. Migrate Ingredient Groups
    console.log("📦 Migrating ingredient groups...");
    const groups = await prisma.ingredientGroup.findMany();
    if (groups.length) {
      for (const group of groups) {
        await db.insert(schema.ingredientGroups).values({
          id: group.id,
          versionId: group.versionId,
          name: group.name,
          orderIndex: group.orderIndex,
          enableBakersPercent: group.enableBakersPercent,
          createdAt: group.createdAt,
          updatedAt: group.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${groups.length} ingredient groups`);
    }

    // 10. Migrate Ingredients
    console.log("📦 Migrating ingredients...");
    const ingredients = await prisma.ingredient.findMany();
    if (ingredients.length) {
      for (const ing of ingredients) {
        await db.insert(schema.ingredients).values({
          id: ing.id,
          versionId: ing.versionId,
          groupId: ing.groupId,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          role: ing.role as schema.IngredientRole,
          notes: ing.notes,
          sortOrder: ing.sortOrder,
          createdAt: ing.createdAt,
          updatedAt: ing.updatedAt,
        }).onConflictDoNothing();
      }
      console.log(`   ✅ Migrated ${ingredients.length} ingredients`);
    }

    console.log("\n✨ Migration completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Test the app with Turso connection");
    console.log("2. Replace imports from recipesService to recipesService.drizzle");
    console.log("3. Remove Prisma dependencies once confirmed working");

  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
