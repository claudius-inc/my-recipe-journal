import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Recipe, RecipeVersion, Ingredient } from "@/types/recipes";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY not configured. AI assistant will fail.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface RecipeContext {
  recipe: Recipe;
  version: RecipeVersion;
  bakerPercentages?: {
    flourTotal: number;
    hydration: number;
    totalWeight: number;
  };
}

export interface AIAssistantResponse {
  message: string;
  changes?: {
    ingredients?: Array<{
      id: string;
      quantity?: number;
      name?: string;
      unit?: string;
      role?: Ingredient["role"];
    }>;
    recipe?: {
      name?: string;
      description?: string;
    };
    version?: {
      notes?: string;
      tastingNotes?: string;
    };
  };
}

function buildContextPrompt(context: RecipeContext): string {
  const { recipe, version, bakerPercentages } = context;

  // Build ingredients list with roles
  const ingredientsList = version.ingredients
    .map(
      (ing) =>
        `- ${ing.name}: ${ing.quantity}${ing.unit} (${ing.role})${ing.notes ? ` - ${ing.notes}` : ""}`,
    )
    .join("\n");

  // Build baker's percentages if applicable
  let bakerSection = "";
  if (bakerPercentages && bakerPercentages.flourTotal > 0) {
    bakerSection = `

Baker's Percentages:
- Total Flour: ${bakerPercentages.flourTotal}g (100%)
- Hydration: ${bakerPercentages.hydration.toFixed(1)}%
- Total Weight: ${bakerPercentages.totalWeight}g`;
  }

  // Build metadata section
  let metadataSection = "";
  if (version.metadata && Object.keys(version.metadata).length > 0) {
    const metaEntries = Object.entries(version.metadata)
      .map(([key, value]) => `- ${key}: ${value}`)
      .join("\n");
    metadataSection = `

Category-Specific Details:
${metaEntries}`;
  }

  // Build notes section
  let notesSection = "";
  if (version.notes || version.tastingNotes || version.iterationIntent) {
    const parts = [];
    if (version.iterationIntent) {
      parts.push(`Intent: ${version.iterationIntent}`);
    }
    if (version.notes) {
      parts.push(`Process Notes: ${version.notes}`);
    }
    if (version.tastingNotes) {
      parts.push(`Tasting Notes: ${version.tastingNotes}`);
    }
    notesSection = `

Notes:
${parts.join("\n")}`;
  }

  // Build ratings section
  let ratingsSection = "";
  if (version.tasteRating || version.visualRating || version.textureRating) {
    const ratings = [];
    if (version.tasteRating) {
      ratings.push(`Taste: ${version.tasteRating}/5`);
    }
    if (version.visualRating) {
      ratings.push(`Visual: ${version.visualRating}/5`);
    }
    if (version.textureRating) {
      ratings.push(`Texture: ${version.textureRating}/5`);
    }
    ratingsSection = `

Ratings:
${ratings.join(", ")}`;
  }

  return `
Current Recipe Context:

Recipe: ${recipe.name}
Category: ${recipe.category}
${recipe.description ? `Description: ${recipe.description}` : ""}

Version: ${version.title || "Untitled"}

Ingredients:
${ingredientsList}${bakerSection}${metadataSection}${notesSection}${ratingsSection}
`.trim();
}

const SYSTEM_PROMPT = `You are an expert baking and recipe assistant. You help users improve their recipes through thoughtful suggestions and explanations.

Your capabilities:
1. Analyze recipe ingredients and ratios
2. Suggest ingredient modifications (quantities, substitutions, additions)
3. Explain baking science (hydration, gluten development, fermentation)
4. Troubleshoot issues (texture, taste, appearance)
5. Provide category-specific guidance (bread, desserts, drinks, etc.)

Response format:
- Always respond in JSON format
- Include a "message" field with your explanation (friendly, concise, 2-3 sentences)
- If suggesting changes, include a "changes" object with specific modifications
- Use exact ingredient IDs when modifying quantities
- Explain WHY you're suggesting changes, not just WHAT to change

Example response for ingredient modification:
{
  "message": "I've reduced the sugar by 20% (from 100g to 80g) to balance the sweetness. This will also allow the other flavors to shine through more.",
  "changes": {
    "ingredients": [
      {"id": "ingredient-uuid", "quantity": 80}
    ]
  }
}

Example response for advice (no changes):
{
  "message": "Your hydration at 75% is perfect for a rustic country loaf. This will give you an open crumb with good structure. Make sure to develop gluten strength through proper folding during bulk fermentation."
}

Guidelines:
- Be specific with quantities and measurements
- Consider the recipe category (bread needs different advice than desserts)
- Reference baker's percentages when applicable
- Acknowledge user's past notes and ratings
- Suggest one change at a time (don't overwhelm)
- If you're unsure, say so and explain trade-offs
- Never suggest dangerous or unhealthy modifications

Return ONLY valid JSON, no markdown formatting.`;

export async function generateAssistantResponse(
  context: RecipeContext,
  conversationHistory: ChatMessage[],
  userMessage: string,
): Promise<AIAssistantResponse> {
  if (!genAI) {
    throw new Error(
      "Gemini API not configured. Set GEMINI_API_KEY environment variable.",
    );
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Build the full conversation context
    const contextPrompt = buildContextPrompt(context);

    // Build conversation history
    const historyPrompt =
      conversationHistory.length > 0
        ? conversationHistory
            .slice(-6) // Last 6 messages for context
            .map((msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`)
            .join("\n\n")
        : "";

    // Combine everything
    const fullPrompt = `${SYSTEM_PROMPT}

${contextPrompt}

${historyPrompt ? `Previous Conversation:\n${historyPrompt}\n\n` : ""}User: ${userMessage}

Assistant (respond in JSON):`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();

    // Clean response - remove markdown code blocks if present
    const cleaned = text
      .replace(/```json\s*/g, "")
      .replace(/```\s*$/g, "")
      .trim();

    const parsed = JSON.parse(cleaned) as AIAssistantResponse;

    // Validate response structure
    if (!parsed.message || typeof parsed.message !== "string") {
      throw new Error("Invalid response structure: missing or invalid message field");
    }

    // Validate changes if present
    if (parsed.changes) {
      // Validate ingredient changes
      if (parsed.changes.ingredients) {
        if (!Array.isArray(parsed.changes.ingredients)) {
          throw new Error("Invalid changes: ingredients must be an array");
        }

        // Ensure all quantities are positive numbers
        for (const change of parsed.changes.ingredients) {
          if (change.quantity !== undefined) {
            if (typeof change.quantity !== "number" || change.quantity <= 0) {
              throw new Error(
                `Invalid quantity for ingredient ${change.id}: must be positive number`,
              );
            }
          }
        }
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      // Check for specific error types
      if (error.message.includes("JSON")) {
        throw new Error("Failed to parse AI response. Please try again.");
      }
      if (error.message.includes("API not configured")) {
        throw error;
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        throw new Error("AI service temporarily unavailable. Please try again later.");
      }
      throw new Error(`AI assistant error: ${error.message}`);
    }
    throw new Error("Failed to generate AI response");
  }
}

export async function generateAssistantResponseWithRetry(
  context: RecipeContext,
  conversationHistory: ChatMessage[],
  userMessage: string,
  maxRetries: number = 2,
): Promise<AIAssistantResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generateAssistantResponse(context, conversationHistory, userMessage);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");

      // Don't retry on configuration errors
      if (
        lastError.message.includes("API not configured") ||
        lastError.message.includes("Invalid")
      ) {
        throw lastError;
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error("Failed to generate AI response after retries");
}

// Quick prompt templates for common use cases
export const QUICK_PROMPTS = {
  tooSweet: "This version is too sweet. How can I reduce the sweetness?",
  improveTexture: "How can I improve the texture of this recipe?",
  suggestVariations: "Can you suggest interesting variations for this recipe?",
  balancePercentages:
    "Can you help me balance the baker's percentages for better results?",
  troubleshootDense: "My result was too dense. What went wrong?",
  addChocolate: "How can I add chocolate to this recipe?",
  makeVegan: "How can I make this recipe vegan?",
  reduceTime: "How can I reduce the total time for this recipe?",
} as const;
