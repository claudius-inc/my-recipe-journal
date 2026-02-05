import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  isR2Enabled,
  r2Client,
  generateR2Key,
  getR2PublicUrl,
  getFileExtension,
} from "@/lib/r2";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isR2Enabled()) {
      return NextResponse.json(
        { error: "R2 storage is not configured", fallback: true },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const recipeId = formData.get("recipeId") as string;
    const versionId = formData.get("versionId") as string;

    if (!file || !recipeId || !versionId) {
      return NextResponse.json(
        { error: "Missing required fields: file, recipeId, versionId" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return NextResponse.json(
        { error: "Invalid file type. Only images are allowed." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File size exceeds 5MB limit" }, { status: 400 });
    }

    const fileExtension = getFileExtension(file.type);
    const r2Key = generateR2Key(session.user.id, recipeId, versionId, fileExtension);

    const buffer = Buffer.from(await file.arrayBuffer());

    await r2Client!.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: r2Key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    const publicUrl = getR2PublicUrl(r2Key);

    return NextResponse.json({ publicUrl, r2Key });
  } catch (error) {
    console.error("Error uploading photo:", error);
    return NextResponse.json(
      {
        error: "Failed to upload photo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
