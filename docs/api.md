## REST API Reference

All routes are served from the Next.js App Router under `/api`. Responses follow `{ data: ... }` or `{ error: string }` structures.

### Recipes

| Method | Path                                 | Description                                                                                                                                |
| ------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/recipes?limit={n}&cursor={id}` | Returns paginated recipes ordered by `updatedAt desc`. Response includes `data` array and `nextCursor`.                                    |
| POST   | `/api/recipes`                       | Creates a recipe with an initial empty version. Body: `{ name: string, category: RecipeCategory, description?: string, tags?: string[] }`. |
| GET    | `/api/recipes/:recipeId`             | Fetches a single recipe with versions and ingredients.                                                                                     |
| PATCH  | `/api/recipes/:recipeId`             | Updates recipe fields or switches `activeVersionId`. Body accepts partial `{ name, description, category, tags, activeVersionId }`.        |

### Versions

| Method | Path                                         | Description                                                                                                                                                                                                    |
| ------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/recipes/:recipeId/versions`            | Creates a new version or clones an existing one. Body supports `{ title, baseVersionId, scalingFactor, notes, tastingNotes, nextSteps, metadata, setActive }`. Metadata keys must map to string/number values. |
| PATCH  | `/api/recipes/:recipeId/versions/:versionId` | Updates version fields, metadata, or photo URL.                                                                                                                                                                |
| DELETE | `/api/recipes/:recipeId/versions/:versionId` | Deletes a version and reassigns the active version if necessary.                                                                                                                                               |

### Ingredients

| Method | Path                                                                   | Description                                                                                                                            |
| ------ | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/recipes/:recipeId/versions/:versionId/ingredients`               | Adds an ingredient to a version. Body: `{ name, quantity, unit, role, notes?, sortOrder? }`. Auto-increments `sortOrder` when omitted. |
| PATCH  | `/api/recipes/:recipeId/versions/:versionId/ingredients/:ingredientId` | Updates ingredient properties.                                                                                                         |
| DELETE | `/api/recipes/:recipeId/versions/:versionId/ingredients/:ingredientId` | Removes an ingredient.                                                                                                                 |

### Ingredient Suggestions

| Method | Path                                         | Description                                                                                       |
| ------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| GET    | `/api/ingredients/suggestions?recipeId={id}` | Returns unique ingredient names used globally or within a recipe. Useful for autocomplete inputs. |

### Pagination Notes

- Recipes endpoint uses cursor-based pagination. Request `limit` (1–50, default 20) and pass returned `nextCursor` to fetch subsequent pages.
- When `nextCursor` is `null`, the dataset is exhausted.

### Error Handling

- Errors are returned as `{ error: string }` with appropriate HTTP status codes (400 for validation issues, 404 when missing, 500 for unexpected errors).
- Client helpers surface these errors so UI layers can display notifications.
