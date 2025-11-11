import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Validate required environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://your-bucket.your-domain.com

if (
  !CLOUDFLARE_ACCOUNT_ID ||
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_BUCKET_NAME
) {
  console.warn(
    "⚠️  R2 environment variables not configured. Photo uploads will use fallback Base64 storage.",
  );
}

// Create S3-compatible client for Cloudflare R2
export const r2Client =
  CLOUDFLARE_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: R2_ACCESS_KEY_ID,
          secretAccessKey: R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

/**
 * Check if R2 is configured and available
 */
export function isR2Enabled(): boolean {
  return r2Client !== null && !!R2_BUCKET_NAME;
}

/**
 * Generate a unique key for storing an image in R2
 */
export function generateR2Key(
  userId: string,
  recipeId: string,
  versionId: string,
  fileExtension: string,
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `users/${userId}/recipes/${recipeId}/versions/${versionId}/${timestamp}-${random}.${fileExtension}`;
}

/**
 * Get file extension from content type
 */
export function getFileExtension(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };
  return extensions[contentType.toLowerCase()] || "jpg";
}

/**
 * Generate a presigned URL for uploading a file to R2
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300, // 5 minutes
): Promise<string> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("R2 is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Delete an object from R2
 */
export async function deleteR2Object(key: string): Promise<void> {
  if (!r2Client || !R2_BUCKET_NAME) {
    throw new Error("R2 is not configured");
  }

  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });

  await r2Client.send(command);
}

/**
 * Get the public URL for an R2 object
 */
export function getR2PublicUrl(key: string): string {
  if (!R2_PUBLIC_URL) {
    throw new Error("R2_PUBLIC_URL is not configured");
  }
  return `${R2_PUBLIC_URL}/${key}`;
}

/**
 * Extract R2 key from a public URL
 */
export function extractR2KeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_URL) {
    return null;
  }
  const prefix = `${R2_PUBLIC_URL}/`;
  if (url.startsWith(prefix)) {
    return url.substring(prefix.length);
  }
  return null;
}
