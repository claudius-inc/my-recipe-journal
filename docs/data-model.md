## Data Model

Prisma schema lives in `prisma/schema.prisma`. SQLite is used for local development; swap the `DATABASE_URL` for production databases.

### Entities

- **Recipe**
  - Fields: `id`, `name`, `category`, `description?`, `tags? (Json)`, timestamps, `activeVersionId?`.
  - Relations: has many `RecipeVersion`; optional one-to-one `activeVersion`.
- **RecipeVersion**
  - Fields: `id`, `recipeId`, `title`, `notes`, `tastingNotes`, `nextSteps`, `metadata (Json?)`, `photoUrl?`, timestamps.
  - Relations: belongs to `Recipe`; has many `Ingredient`.
- **Ingredient**
  - Fields: `id`, `versionId`, `name`, `quantity (Float)`, `unit`, `role (IngredientRole enum)`, `notes?`, `sortOrder`, timestamps.
  - Relations: belongs to `RecipeVersion`.

### Enums

- **RecipeCategory:** `bread | dessert | drink | main | sauce | other`.
- **IngredientRole:** `flour | liquid | preferment | salt | sweetener | fat | add_in | spice | other`.

### Relationships & Cascades

- Deleting a recipe cascades to versions and ingredients (`onDelete: Cascade`).
- `activeVersionId` uses `SetNull` when a linked version is removed.
- Ingredients are ordered via `sortOrder`; service layer auto-assigns sequential values.

### Metadata Handling

- `RecipeVersion.metadata` stores category-specific fields as JSON.
- Service layer sanitizes metadata, persisting only string or number values.
- When cloning versions, metadata copies forward and can be overridden by the request payload.

### Seeding

- `prisma/seed.ts` seeds sample data (Country Sourdough, Citrus Tonic, Crispy Gochujang Tofu) illustrating versions, ingredients, and metadata usage.
- Run `npm run db:seed` after migrations to populate dev database.

### Migration Workflow

1. Update `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name <description>`.
3. Optionally regenerate the client: `npx prisma generate`.
4. For production deploys use `npx prisma migrate deploy`.
