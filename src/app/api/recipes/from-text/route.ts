import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromTextWithRetry } from "@/lib/gemini";
import { normalizeExtractedRecipe } from "@/lib/recipe-importers/normalize";
import { requireAuth } from "@/lib/auth-utils";
import { checkRateLimit, HOUR_MS } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_TEXT_LENGTH = 20000;

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError, status } = await requireAuth(request);
    if (!userId) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { allowed, retryAfter } = checkRateLimit(
      `import-text:${userId}`,
      RATE_LIMIT_MAX_REQUESTS,
      HOUR_MS,
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} imports per hour.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { text?: string };
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (text.length < 20) {
      return NextResponse.json(
        { error: "Please paste a longer recipe (ingredients and steps)." },
        { status: 400 },
      );
    }

    const extracted = normalizeExtractedRecipe(
      await extractRecipeFromTextWithRetry(text.slice(0, MAX_TEXT_LENGTH)),
    );

    return NextResponse.json(extracted, { status: 200 });
  } catch (error) {
    console.error("Recipe text import error:", error);
    if (error instanceof Error) {
      if (error.message.includes("API not configured")) {
        return NextResponse.json(
          { error: "Recipe import service not configured" },
          { status: 503 },
        );
      }
      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: `Extraction failed: ${error.message}` },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: "Failed to import recipe" }, { status: 500 });
  }
}
