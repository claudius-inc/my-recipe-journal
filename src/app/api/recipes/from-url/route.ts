import { NextRequest, NextResponse } from "next/server";
import { getImporter, hasSpecificAdapter } from "@/lib/recipe-importers/importerFactory";
import {
  downloadAndOptimizeImage,
  imageToDataUri,
  isImageOptimizationAvailable,
} from "@/lib/imageOptimizer";

export const runtime = "nodejs";
export const maxDuration = 30;

// Simple in-memory rate limiting
// In production, you'd want to use Redis or a database
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const RATE_LIMIT_MAX_REQUESTS = 10;

function getRateLimitKey(request: NextRequest): string {
  // In production, you'd use user ID from auth
  // For now, use IP address as a simple rate limit key
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0] : "unknown";
  return `import-url:${ip}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    // Create new rate limit window
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - record.count };
}

export async function POST(request: NextRequest) {
  try {
    // Check rate limit
    const rateLimitKey = getRateLimitKey(request);
    const { allowed, remaining } = checkRateLimit(rateLimitKey);

    if (!allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Maximum 10 imports per hour." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "Retry-After": "3600",
          },
        },
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const url = body.url as string | undefined;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Only allow http and https protocols
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only HTTP and HTTPS URLs are supported" },
        { status: 400 },
      );
    }

    // Get appropriate importer
    const importer = getImporter(url);
    const usingAdapter = hasSpecificAdapter(url);

    console.log(`Importing recipe from: ${url}`);
    console.log(
      `Using importer: ${importer.name}${usingAdapter ? " (dedicated adapter)" : " (AI fallback)"}`,
    );

    // Extract recipe data
    const extractedData = await importer.extract(url);

    console.log(`Successfully extracted recipe: ${extractedData.name}`);

    // Download and optimize image if present and optimization is available
    if (extractedData.imageUrl) {
      if (!isImageOptimizationAvailable()) {
        console.warn(
          "Image optimization unavailable (sharp not installed) - keeping original URL",
        );
        // Keep the original imageUrl - it will be displayed directly
      } else {
        try {
          console.log(`Downloading and optimizing image from: ${extractedData.imageUrl}`);
          const optimized = await downloadAndOptimizeImage(extractedData.imageUrl);

          // Convert to base64 data URI for preview
          const dataUri = imageToDataUri(optimized.buffer, optimized.format);
          extractedData.imageUrl = dataUri;

          console.log(
            `Image optimized: ${optimized.width}x${optimized.height}, ${Math.round(optimized.size / 1024)}KB`,
          );
        } catch (imageError) {
          // Log error but continue with recipe import without image
          console.warn(`Failed to download/optimize image:`, imageError);
          extractedData.imageUrl = undefined;
        }
      }
    }

    return NextResponse.json(extractedData, {
      status: 200,
      headers: {
        "X-RateLimit-Remaining": remaining.toString(),
        "X-Importer-Type": usingAdapter ? "adapter" : "fallback",
        "X-Importer-Name": importer.name,
      },
    });
  } catch (error) {
    console.error("Recipe URL import error:", error);

    if (error instanceof Error) {
      // Handle specific error types
      if (error.message.includes("API not configured")) {
        return NextResponse.json(
          { error: "Recipe import service not configured" },
          { status: 503 },
        );
      }

      if (error.message.includes("timeout") || error.message.includes("took too long")) {
        return NextResponse.json(
          { error: "Website took too long to respond. Please try again." },
          { status: 504 },
        );
      }

      if (error.message.includes("quota") || error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Service temporarily unavailable. Please try again later." },
          { status: 429 },
        );
      }

      if (error.message.includes("No recipe found")) {
        return NextResponse.json(
          { error: "No recipe found on this page. Please check the URL." },
          { status: 400 },
        );
      }

      if (error.message.includes("Invalid URL")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (error.message.includes("HTTP 403") || error.message.includes("HTTP 401")) {
        return NextResponse.json(
          { error: "Access denied by website. This site may block automated access." },
          { status: 403 },
        );
      }

      if (error.message.includes("HTTP 404")) {
        return NextResponse.json(
          { error: "Recipe not found. Please check the URL." },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: `Import failed: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to import recipe from URL" },
      { status: 500 },
    );
  }
}
