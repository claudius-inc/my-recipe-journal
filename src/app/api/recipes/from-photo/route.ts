import { NextRequest, NextResponse } from "next/server";
import { extractRecipeFromPhotoWithRetry } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
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

    // Extract recipe data using Gemini
    const extractedData = await extractRecipeFromPhotoWithRetry(base64, file.type);

    return NextResponse.json(extractedData, { status: 200 });
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
