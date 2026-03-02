import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ============ USERS & AUTH ============

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index("sessions_user_id_idx").on(table.userId),
}));

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: text("token_type"),
  scope: text("scope"),
  idToken: text("id_token"),
  sessionState: text("session_state"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index("accounts_user_id_idx").on(table.userId),
  providerIdx: uniqueIndex("accounts_provider_idx").on(table.provider, table.providerAccountId),
}));

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  identifierValueIdx: uniqueIndex("verifications_identifier_value_idx").on(table.identifier, table.value),
}));

// ============ RECIPES ============

// Enums as text with type safety
export type RecipeCategory = "bread" | "dessert" | "drink" | "main" | "sauce" | "other";
export type PrimaryCategory = "baking" | "cooking" | "beverages" | "other";
export type SecondaryCategory = 
  | "bread" | "sourdough" | "cookies" | "cakes" | "pastries" | "pies"
  | "main_dish" | "appetizer" | "side_dish" | "sauce" | "condiment"
  | "coffee" | "tea" | "cocktail" | "smoothie" | "fermented"
  | "other";
export type IngredientRole = "flour" | "liquid" | "preferment" | "salt" | "sweetener" | "fat" | "add_in" | "spice" | "other";

export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").$type<RecipeCategory>().notNull(),
  primaryCategory: text("primary_category").$type<PrimaryCategory>(),
  secondaryCategory: text("secondary_category").$type<SecondaryCategory>(),
  description: text("description"),
  tags: text("tags", { mode: "json" }).$type<string[]>(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  archivedAt: integer("archived_at", { mode: "timestamp" }),
  pinnedAt: integer("pinned_at", { mode: "timestamp" }),
  activeVersionId: text("active_version_id"),
}, (table) => ({
  userIdIdx: index("recipes_user_id_idx").on(table.userId),
  pinnedAtIdx: index("recipes_pinned_at_idx").on(table.pinnedAt),
  categoryIdx: index("recipes_category_idx").on(table.primaryCategory, table.secondaryCategory),
}));

export const recipeVersions = sqliteTable("recipe_versions", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  title: text("title").default("").notNull(),
  steps: text("steps", { mode: "json" }).$type<unknown[]>().default([]),
  notes: text("notes").default("").notNull(),
  nextSteps: text("next_steps").default("").notNull(),
  // Legacy single photo fields
  photoUrl: text("photo_url"),
  r2Key: text("r2_key"),
  // Ratings
  tasteRating: integer("taste_rating"),
  visualRating: integer("visual_rating"),
  textureRating: integer("texture_rating"),
  tasteNotes: text("taste_notes"),
  visualNotes: text("visual_notes"),
  textureNotes: text("texture_notes"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  recipeIdIdx: index("versions_recipe_id_idx").on(table.recipeId),
}));

export const versionPhotos = sqliteTable("version_photos", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  photoUrl: text("photo_url").notNull(),
  r2Key: text("r2_key"),
  order: integer("order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  versionIdIdx: index("photos_version_id_idx").on(table.versionId),
  versionOrderIdx: index("photos_version_order_idx").on(table.versionId, table.order),
}));

export const ingredientGroups = sqliteTable("ingredient_groups", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  enableBakersPercent: integer("enable_bakers_percent", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  versionIdIdx: index("groups_version_id_idx").on(table.versionId),
  versionOrderIdx: index("groups_version_order_idx").on(table.versionId, table.orderIndex),
}));

export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  versionId: text("version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  groupId: text("group_id").references(() => ingredientGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull(),
  role: text("role").$type<IngredientRole>().notNull(),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  versionIdIdx: index("ingredients_version_id_idx").on(table.versionId),
  groupIdIdx: index("ingredients_group_id_idx").on(table.groupId),
}));

// ============ RELATIONS ============

export const usersRelations = relations(users, ({ many }) => ({
  recipes: many(recipes),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const recipesRelations = relations(recipes, ({ one, many }) => ({
  user: one(users, { fields: [recipes.userId], references: [users.id] }),
  versions: many(recipeVersions, { relationName: "recipeVersions" }),
  activeVersion: one(recipeVersions, { 
    fields: [recipes.activeVersionId], 
    references: [recipeVersions.id],
    relationName: "activeVersion"
  }),
}));

export const recipeVersionsRelations = relations(recipeVersions, ({ one, many }) => ({
  recipe: one(recipes, { 
    fields: [recipeVersions.recipeId], 
    references: [recipes.id],
    relationName: "recipeVersions"
  }),
  recipeActive: one(recipes, { 
    fields: [recipeVersions.id], 
    references: [recipes.activeVersionId],
    relationName: "activeVersion"
  }),
  photos: many(versionPhotos),
  ingredientGroups: many(ingredientGroups),
  ingredients: many(ingredients),
}));

export const versionPhotosRelations = relations(versionPhotos, ({ one }) => ({
  version: one(recipeVersions, { fields: [versionPhotos.versionId], references: [recipeVersions.id] }),
}));

export const ingredientGroupsRelations = relations(ingredientGroups, ({ one, many }) => ({
  version: one(recipeVersions, { fields: [ingredientGroups.versionId], references: [recipeVersions.id] }),
  ingredients: many(ingredients),
}));

export const ingredientsRelations = relations(ingredients, ({ one }) => ({
  version: one(recipeVersions, { fields: [ingredients.versionId], references: [recipeVersions.id] }),
  group: one(ingredientGroups, { fields: [ingredients.groupId], references: [ingredientGroups.id] }),
}));
