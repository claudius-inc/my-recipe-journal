# Recipe Import Feature

This document describes the recipe import feature that allows users to import recipes from external websites.

## Overview

The recipe import feature uses an **adapter pattern** with site-specific scrapers for supported websites and a **Gemini AI fallback** for unsupported sites.

## Architecture

```
User Input (URL)
    ↓
ImporterFactory
    ↓
    ├─→ Site-specific adapter (if URL matches)
    │   └─→ CottaJpImporter (for cotta.jp)
    │
    └─→ GeminiImporter (fallback for any URL)
    ↓
ExtractedRecipeData
    ↓
Preview & Edit Modal
    ↓
createRecipeWithData()
```

## Features

### 1. Site-Specific Adapters

#### Cotta.jp Adapter

- **URL Pattern**: `https://www.cotta.jp/recipe/recipe.php?recipeid=XXXXX`
- **Extraction Method**: JSON-LD Schema.org markup
- **Handles Japanese text**: ✅
- **Extracts**:
  - Recipe name
  - Category (inferred from name)
  - Description
  - Ingredients (with quantities, units, and roles)
  - Instructions (step-by-step)
  - Servings

**Example URL**: https://www.cotta.jp/recipe/recipe.php?recipeid=00016428

### 2. Gemini AI Fallback

- **Purpose**: Handle any website not supported by a specific adapter
- **Method**: Fetches HTML → Sends to Gemini → Parses structured response
- **Retry Logic**: Up to 2 retries with exponential backoff
- **Timeout**: 30 seconds per request

### 3. Rate Limiting

- **Limit**: 10 imports per hour per user (IP-based)
- **Window**: 1 hour rolling window
- **Response**: HTTP 429 with `Retry-After` header

## API Endpoint

### `POST /api/recipes/from-url`

**Request**:

```json
{
  "url": "https://www.cotta.jp/recipe/recipe.php?recipeid=00016428"
}
```

**Response** (Success):

```json
{
  "name": "材料3つ♪簡単焼きチョコ",
  "category": {
    "primary": "baking",
    "secondary": "cookies"
  },
  "description": "焼き立てはホロホロ...",
  "ingredients": [
    {
      "name": "チョコレート",
      "quantity": 100,
      "unit": "g",
      "role": "other",
      "notes": null
    }
  ],
  "instructions": "1. 下準備\n\n2. チョコは湯煎で...",
  "servings": 13,
  "sourceUrl": "https://www.cotta.jp/recipe/recipe.php?recipeid=00016428"
}
```

**Error Responses**:

- `400`: Invalid URL or no recipe found
- `403`: Access denied by website
- `404`: Recipe not found
- `429`: Rate limit exceeded
- `503`: Service not configured
- `504`: Request timeout

## UI Flow

### 1. RecipeSidebar Dropdown

Users can create recipes via:

1. **New blank recipe** - Manual entry
2. **Scan from photo** - Photo extraction (existing feature)
3. **Import from URL** - NEW feature

### 2. Import Modal

**Step 1: URL Input**

- User pastes recipe URL
- Click "Extract Recipe"
- Loading state shows "Extracting..."

**Step 2: Preview & Edit**

- Shows extracted data
- User can edit:
  - Recipe name
  - Category
  - Description
- Shows read-only preview of:
  - Ingredients list
  - Instructions
  - Source URL
- Click "Save Recipe" to create

### 3. Error Handling

- **Invalid URL**: Shows error inline
- **Extraction failed**: Shows detailed error message
- **Rate limit**: Shows "Try again later" message
- **Network error**: Shows "Connection failed" message

## File Structure

```
src/
├── lib/
│   └── recipe-importers/
│       ├── base/
│       │   ├── types.ts              # Interfaces
│       │   └── RecipeImporter.ts     # Base class
│       ├── adapters/
│       │   └── CottaJpImporter.ts    # Cotta.jp adapter
│       ├── gemini/
│       │   └── GeminiImporter.ts     # AI fallback
│       └── importerFactory.ts        # Factory pattern
├── app/
│   └── api/
│       └── recipes/
│           └── from-url/
│               └── route.ts          # API route
├── components/
│   ├── recipes/
│   │   └── ImportFromUrlModal.tsx   # UI component
│   └── layout/
│       └── RecipeSidebar.tsx        # Updated with dropdown
└── store/
    └── RecipeStore.tsx              # Uses existing createRecipeWithData()
```

## Adding New Adapters

To add support for a new website:

### 1. Create Adapter Class

```typescript
import { RecipeImporter } from "../base/RecipeImporter";
import type { ExtractedRecipeData } from "../base/types";

export class MySiteImporter extends RecipeImporter {
  readonly name = "MySite.com";

  canHandle(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.hostname === "www.mysite.com";
    } catch {
      return false;
    }
  }

  async extract(url: string): Promise<ExtractedRecipeData> {
    const html = await this.fetchHtml(url);
    // Parse HTML and extract data
    // ...
    return {
      name: "...",
      category: { primary: "baking", secondary: "bread" },
      ingredients: [...],
      instructions: "...",
      sourceUrl: url,
    };
  }
}
```

### 2. Register in Factory

```typescript
// src/lib/recipe-importers/importerFactory.ts
import { MySiteImporter } from "./adapters/MySiteImporter";

const IMPORTERS: RecipeImporter[] = [
  new MySiteImporter(), // Add here (order matters!)
  new CottaJpImporter(),
  // ...
];
```

## Testing

### Manual Testing

1. **Test Cotta.jp URL**:

   ```
   https://www.cotta.jp/recipe/recipe.php?recipeid=00016428
   ```

   Expected: Extracts 3 ingredients, instructions, etc.

2. **Test Gemini Fallback**:
   Use any recipe URL from another site (e.g., AllRecipes, Serious Eats)

3. **Test Error Cases**:
   - Invalid URL: `not-a-url`
   - Non-recipe page: `https://www.google.com`
   - Non-existent page: `https://www.cotta.jp/recipe/recipe.php?recipeid=99999999`

4. **Test Rate Limiting**:
   - Import 10 recipes quickly
   - 11th request should return 429 error

### Automated Testing

Run the type checker:

```bash
npm run typecheck
```

## Dependencies

- `cheerio` (^1.0.0) - HTML parsing
- `@types/cheerio` (^0.22.0) - TypeScript types
- `@google/generative-ai` (existing) - Gemini AI

## Environment Variables

- `GEMINI_API_KEY` - Required for Gemini fallback and existing photo extraction

## Security Considerations

1. **Rate Limiting**: Prevents abuse (10 requests/hour)
2. **Timeout**: 30s limit prevents hanging requests
3. **URL Validation**: Only HTTP/HTTPS protocols allowed
4. **Error Handling**: Doesn't expose internal errors to users
5. **CORS**: All fetching done server-side

## Future Improvements

1. **More Adapters**: Add support for popular recipe sites
   - AllRecipes.com
   - Food Network
   - Serious Eats
   - King Arthur Baking

2. **Better Rate Limiting**: Use Redis or database instead of in-memory

3. **User Authentication**: Rate limit per authenticated user instead of IP

4. **Recipe Editing**: Allow editing ingredients/instructions before save

5. **Source Attribution**: Display source URL on recipe page

6. **Batch Import**: Import multiple recipes at once

7. **Browser Extension**: Chrome extension for one-click import

## Troubleshooting

### Issue: "Recipe extraction service not configured"

**Solution**: Set `GEMINI_API_KEY` environment variable

### Issue: "Rate limit exceeded"

**Solution**: Wait 1 hour or clear server rate limit cache

### Issue: "No recipe found on this page"

**Solution**: Verify the URL contains a recipe (not a recipe list or homepage)

### Issue: "Website took too long to respond"

**Solution**: Check internet connection; some sites may be slow or blocking automated access

### Issue: Ingredients not extracted correctly

**Solution**:

1. Check if site has a specific adapter (only Cotta.jp for now)
2. For other sites, Gemini fallback may vary in quality
3. Consider adding a site-specific adapter

## License

Part of the My Recipe Journal application.
