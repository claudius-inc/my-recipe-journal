# Recipe Steps Feature - Implementation Summary

## Changes Made

### 1. Database Schema

- ✅ Added `steps` field to `RecipeVersion` model (JSON type, default `[]`)
- ✅ Created migration file: `20251117000000_add_recipe_steps/migration.sql`
- ✅ Generated Prisma client

### 2. Type Definitions

- ✅ Added `RecipeStep` interface to `src/types/recipes.ts`
- ✅ Added `steps` field to `RecipeVersion` interface

### 3. Helper Utilities

- ✅ Created `src/lib/recipe-steps-helpers.ts`
  - `parseInstructionsToSteps()`: Convert text to structured steps
  - `formatStepsAsText()`: Convert steps to formatted text
  - `validateSteps()`: Type guard for validation

### 4. Importers Updated

- ✅ `src/lib/gemini.ts`: Convert instructions to steps
- ✅ `src/lib/recipe-importers/adapters/CottaJpImporter.ts`: Extract steps from schema
- ✅ `src/lib/recipe-importers/gemini/GeminiImporter.ts`: Convert instructions to steps
- ✅ `src/lib/recipe-importers/base/types.ts`: Added `steps` field

### 5. Server-Side

- ✅ `src/server/recipesService.ts`:
  - Added `steps` to `CreateVersionInput`
  - Updated `createVersion()` to handle steps
  - Updated `updateVersionDetails()` to accept steps
- ✅ `src/lib/recipeTransformer.ts`: Parse and validate steps from JSON

### 6. Client-Side Store

- ✅ `src/store/RecipeStore.tsx`:
  - Added `steps` to `createRecipeWithData` interface
  - Updated implementation to save steps
  - Added `steps` to `updateVersion` interface

### 7. UI Components

- ✅ Created `src/components/recipes/RecipeSteps.tsx`:
  - Collapsible section (collapsed by default)
  - Step count badge
  - Add/Edit/Remove steps
  - Self-contained edit mode
- ✅ Updated `src/components/recipes/RecipeView.tsx`:
  - Integrated RecipeSteps component between PhotoSection and VersionNotes
  - Added state management for steps
  - Added handleStepsUpdate callback

### 8. Import Features

- ✅ `src/components/recipes/ImportFromUrlModal.tsx`: Display steps in preview
- ✅ `src/components/layout/RecipeSidebar.tsx`: Pass steps to createRecipeWithData

## How to Test

### 1. Import from Cotta.jp URL

```
1. Open the app
2. Click "Import from URL"
3. Enter a Cotta.jp recipe URL (e.g., https://www.cotta.jp/recipe/recipe.php?recipeid=00016428)
4. Verify steps are extracted and displayed in preview
5. Save the recipe
6. Open the recipe and verify steps appear in collapsed section
```

### 2. Manual Step Addition

```
1. Create or open any recipe
2. Click "Add Recipe Steps" button
3. Click "Add Step" to add multiple steps
4. Enter text for each step
5. Click "Done" to save
6. Verify steps are saved and displayed
```

### 3. Edit Existing Steps

```
1. Open recipe with steps
2. Expand the "Recipe Steps" section
3. Click the edit icon (pencil)
4. Modify/add/remove steps
5. Click "Done"
6. Verify changes are persisted
```

## Migration Notes

- Existing recipes will have `steps = []` by default
- No data migration needed - old `notes` field remains untouched
- Steps are stored as JSON in PostgreSQL
- Type validation ensures data integrity

## Future Enhancements (Not Implemented)

- Drag-and-drop reordering of steps
- Rich text formatting in step text
- Step photos/images
- Step timers
- Convert between steps and notes format
