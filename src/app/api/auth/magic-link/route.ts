import { NextRequest, NextResponse } from "next/server";

/**
 * Magic link request handler
 * Better Auth handles the actual email sending through the configured plugin
 */
export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  try {
    // Forward the request to the auth handler at /api/auth/magic-link endpoint
    // Better Auth will process this automatically
    const response = await fetch("http://localhost:3000/api/auth", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "magicLink",
        email,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Magic link error:", error);
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
  }
}
