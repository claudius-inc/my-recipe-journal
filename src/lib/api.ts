/**
 * Minimal JSON fetch helper for the app's API routes, which return
 * `{ data }` on success and `{ error }` on failure.
 */
export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const body = (await response.json().catch(() => ({}))) as {
    data?: T;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }

  if (!("data" in body)) {
    throw new Error("Malformed API response");
  }

  return body.data as T;
}
