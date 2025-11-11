import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  isR2Enabled,
  generateR2Key,
  generatePresignedUploadUrl,
  getR2PublicUrl,
  getFileExtension,
} from "@/lib/r2";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if R2 is enabled
    if (!isR2Enabled()) {
      return NextResponse.json(
        {
          error: "R2 storage is not configured",
          fallback: true, // Signal to client to use Base64 fallback
        },
        { status: 503 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { recipeId, versionId, contentType, fileSize } = body;

    // Validate required fields
    if (!recipeId || !versionId || !contentType) {
      return NextResponse.json(
        { error: "Missing required fields: recipeId, versionId, contentType" },
        { status: 400 },
      );
    }

    // Validate content type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!allowedTypes.includes(contentType.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid content type. Only images are allowed." },
        { status: 400 },
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize && fileSize > maxSize) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    // Generate unique R2 key
    const fileExtension = getFileExtension(contentType);
    const r2Key = generateR2Key(session.user.id, recipeId, versionId, fileExtension);

    // Generate presigned URL (valid for 5 minutes)
    const presignedUrl = await generatePresignedUploadUrl(r2Key, contentType, 300);

    // Get the public URL where the image will be accessible
    const publicUrl = getR2PublicUrl(r2Key);

    return NextResponse.json({
      presignedUrl,
      publicUrl,
      r2Key,
      expiresIn: 300, // seconds
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json(
      {
        error: "Failed to generate upload URL",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
