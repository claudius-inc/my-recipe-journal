# AI Recipe Assistant

## Overview

The AI Recipe Assistant is a conversational AI feature that helps users improve their recipes through natural language interaction. Built on Google Gemini AI, it analyzes the current recipe state and provides contextual suggestions for ingredient adjustments, recipe improvements, and baking guidance.

## Key Features

### Context-Aware Analysis

The assistant has full access to your current recipe state:

- Recipe name, category, and description
- All ingredients with quantities, units, and roles
- Baker's percentages (for bread recipes)
- Version notes, tasting notes, and iteration intent
- Category-specific metadata (fermentation times, ratings, etc.)
- Previous version history

### Capabilities

**Recipe Adjustments**

- Modify ingredient quantities and ratios
- Suggest ingredient substitutions
- Add or remove ingredients
- Adjust recipe name and description

**Baking Guidance**

- Explain recipe science (hydration, gluten development)
- Troubleshoot issues (texture, taste, appearance)
- Answer technique questions
- Provide category-specific tips

**Smart Suggestions**

- Balance baker's percentages
- Adjust sweetness/saltiness levels
- Improve texture or flavor profile
- Adapt recipes to dietary needs

## User Interface

### Floating Button

- **Location**: Bottom-right corner of recipe edit/create screens
- **Icon**: ✨ sparkle with "AI" label
- **Badge**: Shows notification dot when assistant has suggestions

### Slide-Up Panel

The chat interface appears as a mobile-friendly slide-up panel with three states:

1. **Minimized**: Only the floating button is visible
2. **Partial**: Shows header and recent messages (50% screen height)
3. **Expanded**: Full chat interface (80% screen height)

**Panel Features**:

- Drag handle for resizing (mobile)
- Scrollable message history
- Auto-resizing text input
- Quick prompt buttons for common questions
- Loading indicator during AI generation

### Change Preview

When the AI suggests recipe modifications:

1. A preview section appears showing before/after changes
2. Ingredient changes highlighted (green for increases, red for decreases)
3. "Apply Changes" button to confirm
4. Changes are applied optimistically with React Query

## How to Use

### Starting a Conversation

1. Click the floating AI button (bottom-right)
2. Type your question or use a quick prompt:
   - "Too sweet?" - Get suggestions to reduce sweetness
   - "Improve texture" - Analyze texture-related ingredients
   - "Suggest variations" - Generate recipe alternatives

### Asking Questions

The assistant understands natural language. Examples:

**Ingredient Adjustments**

- "Can you reduce the sugar by 20%?"
- "What if I replace butter with oil?"
- "Add chocolate chips to this recipe"

**Troubleshooting**

- "My bread is too dense, what went wrong?"
- "Why is my hydration so high?"
- "This version was too sweet, help me fix it"

**Guidance**

- "Explain the role of salt in this recipe"
- "What temperature should I proof this?"
- "How do I convert this to sourdough?"

### Applying Changes

When the AI suggests modifications:

1. Review the change preview carefully
2. Click "Apply Changes" to update the recipe
3. Changes are saved immediately via auto-save
4. You can undo through version history if needed

## Technical Details

### AI Model

- **Provider**: Google Gemini
- **Model**: gemini-2.5-flash
- **Configuration**: Same as photo extraction feature
- **Response Time**: Typically 2-5 seconds

### Context Provided to AI

```json
{
  "recipe": {
    "name": "Country Loaf",
    "category": "bread",
    "description": "A rustic sourdough with 75% hydration"
  },
  "version": {
    "title": "Version 3",
    "ingredients": [
      { "name": "Bread flour", "quantity": 500, "unit": "g", "role": "flour" },
      { "name": "Water", "quantity": 375, "unit": "g", "role": "liquid" }
    ],
    "notes": "Increased hydration from v2",
    "tastingNotes": "Good crumb, slightly under-salted",
    "metadata": {
      "bulkFermentation": "4 hours",
      "proofing": "12 hours cold"
    }
  },
  "bakerPercentages": {
    "hydration": 75,
    "flourTotal": 500
  }
}
```

### Change Response Format

```json
{
  "message": "I've reduced the sugar by 20% to balance sweetness...",
  "changes": {
    "ingredients": [{ "id": "ingredient-uuid", "quantity": 80 }],
    "description": "Updated description..."
  }
}
```

### State Management

- Chat history is stored in-memory per version (ephemeral)
- Not persisted to database in v1.0
- Resets when switching versions
- Managed via RecipeStore context

## Limitations (v1.0)

### What It Cannot Do

- Generate entire recipes from scratch (use photo extraction instead)
- Access external recipe databases
- Remember conversations across sessions
- Analyze uploaded photos (planned for v2.0)
- Make real-time calculations during baking

### Rate Limits

- Maximum 10 requests per minute per user
- Prevents excessive API usage
- Error shown if limit exceeded

### Data Privacy

- All conversations are ephemeral (not saved)
- Recipe data sent to Google Gemini API
- No sharing with other users
- Standard Gemini API privacy terms apply

## Best Practices

### Getting Better Results

1. **Be specific**: "Reduce sugar by 15g" vs "make it less sweet"
2. **Provide context**: "The last version was too salty" vs "adjust salt"
3. **Ask one thing at a time**: Better conversation flow
4. **Review changes carefully**: AI suggestions aren't always perfect

### When to Use the Assistant

- Troubleshooting recipe issues
- Making targeted adjustments
- Learning about baking science
- Exploring recipe variations
- Balancing ingredient ratios

### When Not to Use

- Creating recipes from scratch (use photo extraction)
- Complex multi-recipe workflows
- Real-time baking guidance (future feature)
- External recipe research

## Troubleshooting

### "AI service not configured"

- Ensure `GEMINI_API_KEY` is set in `.env`
- Restart development server after adding key
- Check Gemini API quota at https://aistudio.google.com

### "Rate limit exceeded"

- Wait 60 seconds before next request
- Maximum 10 requests per minute
- Contact admin if legitimate high-volume usage

### "Failed to generate response"

- Check internet connection
- Verify Gemini API key is valid
- Try again with simpler question
- Check browser console for detailed errors

### Changes Not Applying

- Ensure you clicked "Apply Changes"
- Check for validation errors in ingredients
- Verify you have edit permissions
- Look for toast notifications with error details

### Slow Response Times

- Normal: 2-5 seconds for simple queries
- Longer for complex recipe analysis (up to 10 seconds)
- Check network inspector for API timing
- Gemini API may have temporary slowdowns

## Future Roadmap

### v1.1 - Enhanced Conversations

- Persistent chat history across sessions
- Multi-step change workflows
- Undo/redo for AI changes

### v2.0 - Visual & Voice

- Upload photos for troubleshooting
- Voice input for hands-free use
- Image analysis with Gemini Vision

### v2.1 - Collaborative Intelligence

- Community insights and trends
- Expert mode with advanced calculations
- Custom training on user preferences

### v3.0 - Predictive Baking

- Outcome prediction before baking
- Real-time guided workflows
- Recipe generation from constraints

See `docs/ai-assistant-roadmap.md` for detailed future plans.

## Support

For issues or feature requests:

1. Check this documentation first
2. Review `docs/architecture.md` for system design
3. Check `AGENTS.md` for AI development guidelines
4. Open GitHub issue with reproduction steps

## Related Documentation

- [Photo Extraction](./photo-extraction.md) - AI-powered recipe extraction from images
- [Architecture](./architecture.md) - System design and patterns
- [API Reference](./api.md) - All API endpoints including AI assistant
