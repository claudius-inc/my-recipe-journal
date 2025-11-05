## Architecture Overview

### High-Level System

- **Next.js App Router** drives routing and layout with `app/layout.tsx` wiring Inter font, Radix Theme provider, and React Query `QueryClientProvider`.
- **RecipeWorkspace** combines the sidebar and recipe editor inside a client boundary, sourcing data from the `RecipeStore` context.
- **RecipeStore (React Query)** performs paginated fetching via `/api/recipes`, exposes mutations for CRUD operations, and keeps selection state in local React state.
- **REST API Routes** under `src/app/api` map to specific resources and delegate to the service layer.
- **Service Layer (`src/server/recipesService.ts`)** encapsulates Prisma calls, validation, pagination, metadata sanitization, and mutation side-effects.
- **Database** uses Prisma ORM with SQLite in development; schema defines `Recipe`, `RecipeVersion`, `Ingredient`, and supporting enums.

### Providers & Shared Context

- **`AppProviders`** wraps the entire app with a React Query client (staleTime 30s) and Radix Theme configuration.
- **`RecipeStore`** uses `useInfiniteQuery` to load pages of recipes, caches results, and exposes helpers for selection, ingredient suggestions, and invalidation.
- Mutation helpers invalidate relevant queries and cache keys to keep UI consistent.

### Data Flow

1. UI components dispatch actions via `useRecipeStore` (e.g., `createRecipe`).
2. Store calls REST endpoints hosted in `/api/recipes/...`.
3. API route validates input, then calls a matching function in `recipesService`.
4. Service layer executes Prisma operations and returns domain models.
5. API returns JSON; store invalidates queries so React Query refreshes data.
6. Components re-render with new query results and selection state updates.

### Client Composition Highlights

- **RecipeSidebar** renders paginated lists, creation form, and search filtering.
- **RecipeView** manages editing UI, baker’s percentage calculations, version tooling, and metadata fields per category.
- **Radix UI** provides foundational themes while Tailwind handles spacing, responsiveness, and custom styles.

### Performance & Caching

- Infinite pagination fetches `PAGE_SIZE` (20) items plus lookahead for next cursor.
- Query keys:
  - Recipes list: `['recipes']`
  - Ingredient suggestions: `['ingredient-suggestions', recipeId]`
- Mutations invalidate these keys to refresh caches; suggestions cache has five-minute stale time.

### Error Handling & Validation

- Service layer normalizes metadata, tags, and ingredient ordering; throws when dependent records missing.
- Store surfaces errors via thrown exceptions (callers can display UI feedback as needed).

### Extensibility Notes

- Add new API endpoints by extending the service layer first, then referencing them in `src/app/api`.
- Consider extracting shared validation or schema helpers if input flows become more complex.
- React Query devtools are available (button bottom-right) for debugging cache state.
