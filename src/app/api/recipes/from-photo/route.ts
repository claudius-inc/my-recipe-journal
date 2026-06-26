import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromPhotoWithRetry } from "@/lib/gemini";
import { normalizeExtractedRecipe } from "@/lib/recipe-importers/normalize";
import { requireAuth } from "@/lib/auth-utils";
import { checkRateLimit, HOUR_MS } from "@/lib/rate-limit";
import {
  optimizeImageBuffer,
  imageToDataUri,
  isImageOptimizationAvailable,
} from "@/lib/imageOptimizer";

export const runtime = "nodejs";
export const maxDuration = 30;

const RATE_LIMIT_MAX_REQUESTS = 20;

export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError, status } = await requireAuth(request);
    if (!userId) {
      return NextResponse.json({ error: authError }, { status });
    }

    const { allowed, retryAfter } = checkRateLimit(
      `import-photo:${userId}`,
      RATE_LIMIT_MAX_REQUESTS,
      HOUR_MS,
    );
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Maximum ${RATE_LIMIT_MAX_REQUESTS} scans per hour.`,
        },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }

    const formData = await request.formData();
    const file = formData.get("photo") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No photo provided" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Supported: JPEG, PNG, WebP" },
        { status: 400 },
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 5MB" },
        { status: 400 },
      );
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString("base64");

    // Extract recipe data using Gemini, then sanitise centrally.
    const extractedData = normalizeExtractedRecipe(
      await extractRecipeFromPhotoWithRetry(base64, file.type),
    );

    // Attach the uploaded photo so the imported recipe keeps its image.
    // Optimize to WebP when sharp is available; otherwise use the original.
    let imageUrl = `data:${file.type};base64,${base64}`;
    if (isImageOptimizationAvailable()) {
      try {
        const optimized = await optimizeImageBuffer(buffer);
        imageUrl = imageToDataUri(optimized.buffer, optimized.format);
      } catch (imageError) {
        console.warn("Failed to optimize uploaded photo:", imageError);
      }
    }

    return NextResponse.json({ ...extractedData, imageUrl }, { status: 200 });
  } catch (error) {
    console.error("Recipe extraction error:", error);

    if (error instanceof Error) {
      if (error.message.includes("API not configured")) {
        return NextResponse.json(
          { error: "Recipe extraction service not configured" },
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

    return NextResponse.json(
      { error: "Failed to process recipe photo" },
      { status: 500 },
    );
  }
}
