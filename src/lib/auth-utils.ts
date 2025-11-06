import { auth } from "./auth";
import { NextRequest } from "next/server";

/**
 * Get the current user session from a request
 * Returns null if not authenticated
 */
export async function getSession(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    return session;
  } catch {
    return null;
  }
}

/**
 * Get the current user ID from a request
 * Returns null if not authenticated
 */
export async function getUserId(request: NextRequest): Promise<string | null> {
  const session = await getSession(request);
  return session?.user?.id ?? null;
}

/**
 * Require authentication for an API route
 * Returns 401 if not authenticated
 */
export async function requireAuth(request: NextRequest) {
  const userId = await getUserId(request);
  if (!userId) {
    return {
      error: "Unauthorized",
      status: 401,
      userId: null,
    };
  }
  return { userId, error: null, status: 200 };
}
