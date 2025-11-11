import { NextRequest, NextResponse } from "next/server";
import {
  generateAssistantResponseWithRetry,
  type ChatMessage,
  type RecipeContext,
} from "@/lib/gemini-assistant";
import type { Recipe, RecipeVersion } from "@/types/recipes";

export const runtime = "nodejs";
export const maxDuration = 15;

// Simple in-memory rate limiting (per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting based on IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Maximum 10 requests per minute. Please try again later.",
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { recipe, version, bakerPercentages, conversationHistory, userMessage } =
      body as {
        recipe: Recipe;
        version: RecipeVersion;
        bakerPercentages?: {
          flourTotal: number;
          hydration: number;
          totalWeight: number;
        };
        conversationHistory: ChatMessage[];
        userMessage: string;
      };

    // Validate required fields
    if (!recipe || !version) {
      return NextResponse.json(
        { error: "Recipe and version are required" },
        { status: 400 },
      );
    }

    if (!userMessage || typeof userMessage !== "string" || !userMessage.trim()) {
      return NextResponse.json({ error: "User message is required" }, { status: 400 });
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Conversation history must be an array" },
        { status: 400 },
      );
    }

    // Build context
    const context: RecipeContext = {
      recipe,
      version,
      bakerPercentages,
    };

    // Generate AI response
    const response = await generateAssistantResponseWithRetry(
      context,
      conversationHistory,
      userMessage.trim(),
    );

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("AI assistant error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API not configured")) {
        return NextResponse.json(
          { error: "AI assistant service not configured" },
          { status: 503 },
        );
      }
      if (
        error.message.includes("quota") ||
        error.message.includes("rate limit") ||
        error.message.includes("temporarily unavailable")
      ) {
        return NextResponse.json(
          {
            error:
              "AI service temporarily unavailable. Please try again in a few moments.",
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: `AI assistant failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate AI response" },
      { status: 500 },
    );
  }
}
