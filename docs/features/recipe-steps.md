# Recipe Steps Feature - Implementation Complete

## Overview

Successfully implemented a dedicated recipe steps feature that separates structured cooking instructions from process notes. Steps are stored as JSON in the database and displayed in a collapsible UI component.

---

## Changes Summary

### Database Layer

**File: `prisma/schema.prisma`**

- Added `steps Json? @default("[]")` field to `RecipeVersion` model

**Migration:**

- Created: `prisma/migrations/20251117000000_add_recipe_steps/migration.sql`
- SQL: `ALTER TABLE "RecipeVersion" ADD COLUMN "steps" JSONB DEFAULT '[]';`

### Type System

**File: `src/types/recipes.ts`**

```typescript
export interface RecipeStep {
  order: number;
  text: string;
}

export type RecipeSteps = RecipeStep[];

// Added to RecipeVersion interface:
steps?: RecipeSteps;
```

### Helper Utilities

**File: `src/lib/recipe-steps-helpers.ts`** (NEW)

- `parseInstructionsToSteps()` - Convert string instructions to structured steps
- `formatStepsAsText()` - Convert steps array back to formatted text
- `validateSteps()` - Type guard for runtime validation

### Importers (URL & Photo)

**Updated Files:**

1. `src/lib/gemini.ts` - Photo extraction converts instructions to steps
2. `src/lib/recipe-importers/adapters/CottaJpImporter.ts` - Extract steps from Cotta.jp
3. `src/lib/recipe-importers/gemini/GeminiImporter.ts` - Parse steps from any URL
4. `src/lib/recipe-importers/base/types.ts` - Added steps field to interface

All importers now return `steps?: RecipeStep[]` instead of `instructions?: string`

### Server-Side (API/Database)

**File: `src/server/recipesService.ts`**

- `CreateVersionInput` now includes `steps?: Array<{ order: number; text: string }>`
- `updateVersionDetails()` accepts steps in payload
- Steps are saved as JSON to database

**File: `src/lib/recipeTransformer.ts`**

- Parse steps from JSON when loading recipes
- Validate steps structure using `validateSteps()`
- Transform Prisma records to RecipeVersion type

### Client State Management

**File: `src/store/RecipeStore.tsx`**

- `createRecipeWithData` interface includes `steps`
- Implementation saves steps when importing recipes
- `updateVersion` interface includes `steps`

### UI Components

**File: `src/components/recipes/RecipeSteps.tsx`** (NEW)

- Collapsible section (collapsed by default)
- Step count badge in header
- Self-contained edit mode (click edit icon to modify)
- Add/remove/reorder steps
- "Add Recipe Steps" button when no steps exist
- Mobile-responsive layout

**File: `src/components/recipes/RecipeView.tsx`**

- Integrated RecipeSteps between PhotoSection and VersionNotes
- Added `stepsDraft` state
- Created `handleStepsUpdate` callback
- Steps sync with selectedVersion

**File: `src/components/recipes/ImportFromUrlModal.tsx`**

- Display imported steps in preview
- Shows step count and numbered list
- Includes steps in save payload

**File: `src/components/layout/RecipeSidebar.tsx`**

- Pass steps to `createRecipeWithData` for URL imports
- Pass steps from photo extraction

---

## User Experience

### Adding Steps

1. Open any recipe
2. Click "Add Recipe Steps" button (appears when no steps exist)
3. Click "Add Step" to create a new step
4. Enter text for each step
5. Click "Done" to save

### Editing Steps

1. Expand "Recipe Steps" section if collapsed
2. Click edit icon (pencil)
3. Modify/add/remove steps as needed
4. Click "Done"
5. Changes save automatically

### Importing with Steps

- **URL Import**: Steps automatically extracted from Cotta.jp and other sites
- **Photo Import**: Gemini AI converts visible instructions to structured steps
- **Preview**: Steps shown before saving recipe

---

## Technical Details

### Data Storage

- **Type**: PostgreSQL JSONB column
- **Default**: Empty array `[]`
- **Structure**: `[{ "order": 1, "text": "Mix ingredients" }, ...]`
- **Validation**: Type guard ensures data integrity

### Format Conversion

Instructions like:

```
1. Mix flour and water
2. Knead for 10 minutes
3. Let rest 1 hour
```

Become:

```json
[
  { "order": 1, "text": "Mix flour and water" },
  { "order": 2, "text": "Knead for 10 minutes" },
  { "order": 3, "text": "Let rest 1 hour" }
]
```

### Backward Compatibility

- Existing recipes have `steps = []` by default
- Old `notes` field unchanged
- No data migration required
- Steps and notes coexist independently

---

## Files Modified

### New Files (3)

1. `src/lib/recipe-steps-helpers.ts`
2. `src/components/recipes/RecipeSteps.tsx`
3. `prisma/migrations/20251117000000_add_recipe_steps/migration.sql`

### Modified Files (11)

1. `prisma/schema.prisma`
2. `src/types/recipes.ts`
3. `src/lib/gemini.ts`
4. `src/lib/recipe-importers/adapters/CottaJpImporter.ts`
5. `src/lib/recipe-importers/gemini/GeminiImporter.ts`
6. `src/lib/recipeTransformer.ts`
7. `src/server/recipesService.ts`
8. `src/store/RecipeStore.tsx`
9. `src/components/recipes/RecipeView.tsx`
10. `src/components/recipes/ImportFromUrlModal.tsx`
11. `src/components/layout/RecipeSidebar.tsx`

---

## Testing Checklist

- [x] TypeScript compilation passes (no errors)
- [x] Prisma client generated successfully
- [ ] Database migration applied
- [ ] Create recipe with manual steps
- [ ] Import from Cotta.jp URL with steps
- [ ] Import from photo with steps
- [ ] Edit existing steps
- [ ] Remove steps
- [ ] Reorder steps
- [ ] Collapsed/expanded state works
- [ ] Step count badge displays correctly
- [ ] Mobile responsive layout

---

## Next Steps (Not Implemented)

Potential future enhancements:

- Drag-and-drop reordering
- Rich text formatting in steps
- Step photos/images
- Step timers
- Bulk import from clipboard
- Export steps to PDF
- Voice dictation for steps

---

## Notes

- Steps are **editable after import** (as required)
- UI defaults to **collapsed** state (as required)
- Position is **between PhotoSection and VersionNotes** (as required)
- **Badge shows step count** in circle on right (as required)
- Field name is **"steps"** displayed as **"Recipe Steps"** (as required)

All requirements from the original specification have been met.
