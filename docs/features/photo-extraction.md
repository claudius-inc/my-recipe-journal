# Photo-to-Recipe Extraction

This feature uses Gemini Vision AI to automatically extract recipe data from photos, making it easy to digitize printed recipes, cookbook pages, or handwritten notes.

## Setup

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Generate a new API key (free tier available)

2. **Configure Environment**

   ```bash
   # Add to .env file
   GEMINI_API_KEY=your_api_key_here
   ```

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

## Usage

1. **Click the "📸 Scan" button** in the recipe sidebar (next to "+ New recipe")
2. **Select a recipe photo** from your device (or use camera on mobile)
3. **Review extracted data** - the form will auto-populate with:
   - Recipe name
   - Category (bread, dessert, drink, main, sauce, other)
   - Ingredients with quantities, units, and roles
   - Instructions/process notes
   - Category-specific metadata
4. **Edit and confirm** - review all fields and make corrections before saving
5. **Create recipe** - click "Create" to save with all extracted data

## What Gets Extracted

The AI analyzes the photo and attempts to extract:

- **Recipe title/name**
- **Category** - inferred from context and recipe type
- **Description** - brief summary if visible
- **Ingredients list** including:
  - Name
  - Quantity (converted to standard units)
  - Unit (g, ml, cup, tbsp, tsp, etc.)
  - Role (flour, liquid, salt, sweetener, etc.)
  - Notes/clarifications
- **Instructions** - combined process steps
- **Cook time** - if visible (e.g., "45 min", "1 hour 20 min")
- **Servings** - yield information
- **Category-specific metadata**:
  - Bread: bulk fermentation notes, proofing details
  - Dessert: sweetness level (1-10), texture notes
  - Drink: brew time, serving temperature
  - Sauce: viscosity notes, pairing suggestions

## Expected Accuracy

Based on Gemini 2.5 Flash capabilities:

| Source Type             | Expected Accuracy | Notes                                       |
| ----------------------- | ----------------- | ------------------------------------------- |
| Printed recipes (clear) | 70-85%            | High confidence, minimal corrections needed |
| Cookbook pages          | 65-80%            | Good accuracy for standard layouts          |
| Handwritten recipes     | 50-70%            | Variable, depends on handwriting clarity    |
| Recipe cards            | 60-75%            | Layout complexity affects accuracy          |
| Screenshots             | 70-85%            | Digital text extracts well                  |

**Key considerations:**

- Always review and correct extracted data before saving
- Poor lighting, angles, or image quality reduce accuracy
- Stains, wrinkles, or partial occlusion may cause errors
- Complex multi-column layouts may be misinterpreted
- Ambiguous measurements may need clarification

## Best Practices

### For Best Results:

1. **Take clear, well-lit photos** with recipe fully visible
2. **Avoid glare or shadows** on the recipe text
3. **Capture full recipe** including title, ingredients, and instructions
4. **Use high resolution** but stay under 5MB file size
5. **Straighten the photo** to reduce perspective distortion

### Supported Formats:

- JPEG / JPG
- PNG
- WebP
- Maximum size: 5MB

### Error Handling:

If extraction fails:

- Check image quality and file format
- Ensure `GEMINI_API_KEY` is properly configured
- Verify API key has sufficient quota
- Try a clearer photo or different angle
- Fall back to manual entry if needed

## Technical Details

### API Endpoint

```
POST /api/recipes/from-photo
Content-Type: multipart/form-data

Form field: photo (File)
Max size: 5MB
Allowed types: image/jpeg, image/png, image/webp
```

### Response Schema

```typescript
{
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    role: IngredientRole;
    notes?: string;
  }>;
  instructions?: string;
  cookTime?: string;
  servings?: number;
  metadata?: Record<string, string | number>;
}
```

### Error Responses

- `400` - Invalid file type or size
- `429` - Rate limit exceeded
- `500` - Extraction failed
- `503` - Service not configured

## Cost Considerations

- Gemini API has a generous free tier
- Monitor usage at [Google AI Studio](https://aistudio.google.com/)
- Consider setting usage limits in production
- Each photo scan = 1 API call
- Failed extractions still count toward quota

## Future Enhancements

Potential improvements:

- Batch photo processing for multiple recipes
- Confidence scores per extracted field
- Interactive correction UI with highlights
- Multi-language recipe support
- Ingredient substitution suggestions
- Nutritional information extraction
