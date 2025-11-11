import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isR2Enabled, deleteR2Object, extractR2KeyFromUrl } from "@/lib/r2";

export async function DELETE(request: NextRequest) {
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
          message: "R2 storage is not configured, nothing to delete",
          success: true,
        },
        { status: 200 },
      );
    }

    // Parse request body
    const body = await request.json();
    const { r2Key, photoUrl } = body;

    // Extract R2 key from either direct key or URL
    let keyToDelete = r2Key;
    if (!keyToDelete && photoUrl) {
      keyToDelete = extractR2KeyFromUrl(photoUrl);
    }

    if (!keyToDelete) {
      return NextResponse.json({ error: "Missing r2Key or photoUrl" }, { status: 400 });
    }

    // Delete the object from R2
    await deleteR2Object(keyToDelete);

    return NextResponse.json({
      success: true,
      message: "Photo deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting photo from R2:", error);

    // Don't fail the request if the object doesn't exist
    if (error instanceof Error && error.name === "NoSuchKey") {
      return NextResponse.json({
        success: true,
        message: "Photo already deleted or does not exist",
      });
    }

    return NextResponse.json(
      {
        error: "Failed to delete photo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
