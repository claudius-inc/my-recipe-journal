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
  - Main recipe photo (NEW)

**Example URL**: https://www.cotta.jp/recipe/recipe.php?recipeid=00016428

### 2. Gemini AI Fallback

- **Purpose**: Handle any website not supported by a specific adapter
- **Method**: Fetches HTML → Sends to Gemini → Parses structured response
- **Retry Logic**: Up to 2 retries with exponential backoff
- **Timeout**: 30 seconds per request
- **Image Extraction**: Extracts main recipe photo from meta tags or content

### 3. Image Processing

When a recipe image is found:

1. **Download**: Image is fetched from source URL (10s timeout)
2. **Optimization**:
   - Resize to max 1200px width (maintains aspect ratio)
   - Convert to WebP format for better compression
   - Compress to ~80% quality
   - Ensure final size < 5MB
3. **Preview**: Converted to base64 data URI for user preview
4. **Storage**: Stored as base64 in database (photoUrl field)
5. **Error Handling**: If download/optimization fails, import continues without image

### 4. Rate Limiting

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
  "sourceUrl": "https://www.cotta.jp/recipe/recipe.php?recipeid=00016428",
  "imageUrl": "data:image/webp;base64,..." // Base64-encoded optimized image
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

- Shows extracted data including recipe photo (if available)
- User can:
  - Edit recipe name, category, and description
  - View and remove the imported photo
  - Preview ingredients list and instructions (read-only)
  - See source URL attribution
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
│   ├── recipe-importers/
│   │   ├── base/
│   │   │   ├── types.ts              # Interfaces (includes imageUrl)
│   │   │   └── RecipeImporter.ts     # Base class
│   │   ├── adapters/
│   │   │   └── CottaJpImporter.ts    # Cotta.jp adapter (with image extraction)
│   │   ├── gemini/
│   │   │   └── GeminiImporter.ts     # AI fallback (with image extraction)
│   │   └── importerFactory.ts        # Factory pattern
│   └── imageOptimizer.ts             # NEW: Image download & optimization
├── app/
│   └── api/
│       └── recipes/
│           └── from-url/
│               └── route.ts          # API route (with image processing)
├── components/
│   ├── recipes/
│   │   └── ImportFromUrlModal.tsx   # UI component (with image preview)
│   └── layout/
│       └── RecipeSidebar.tsx        # Updated with dropdown
└── store/
    └── RecipeStore.tsx              # createRecipeWithData() (supports imageUrl)
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
      imageUrl: "https://...", // Optional: URL to main recipe photo
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

- `cheerio` (^1.1.2) - HTML parsing
- `@types/cheerio` (^0.22.35) - TypeScript types
- `@google/generative-ai` (^0.24.1) - Gemini AI
- `sharp` (latest) - Image optimization (NEW)

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

8. **R2 Storage for Images**: Upload optimized images to Cloudflare R2 instead of base64 storage

9. **Multiple Images**: Support importing multiple recipe photos (step-by-step images)

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

### Issue: Image failed to download or optimize

**Symptoms**: Recipe imports successfully but without photo

**Solution**:

1. This is expected behavior - image failures are non-blocking
2. Check console logs for specific error (timeout, invalid format, etc.)
3. Verify image URL is accessible and not behind authentication
4. Images larger than ~10MB before optimization may fail
5. Can manually upload photo after import using the photo upload feature

## License

Part of the My Recipe Journal application.
