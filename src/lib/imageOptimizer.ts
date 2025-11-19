// Try to load sharp, but gracefully handle if it's not available (e.g., on Windows/WSL)
let sharp: typeof import("sharp") | null = null;
let sharpLoadError: string | null = null;

try {
  sharp = require("sharp");
} catch (error) {
  sharpLoadError = error instanceof Error ? error.message : "Unknown error loading sharp";
  console.warn(
    "Sharp module not available - image optimization disabled. To enable, run: npm install --include=optional",
  );
}

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1200;
const QUALITY = 80;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const DOWNLOAD_TIMEOUT = 10000; // 10 seconds

/**
 * Check if image optimization is available
 */
export function isImageOptimizationAvailable(): boolean {
  return sharp !== null;
}

interface OptimizedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
}

/**
 * Download an image from a URL with timeout
 */
async function downloadImage(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "RecipeJournal/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.startsWith("image/")) {
      throw new Error(`Invalid content type: ${contentType}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error("Image download timeout");
      }
      throw error;
    }
    throw new Error("Failed to download image");
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Optimize an image: resize, convert to WebP, and compress
 */
async function optimizeImage(buffer: Buffer): Promise<OptimizedImage> {
  if (!sharp) {
    throw new Error(
      `Image optimization unavailable: ${sharpLoadError || "sharp module not loaded"}`,
    );
  }

  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Calculate new dimensions while maintaining aspect ratio
    let width = metadata.width || MAX_WIDTH;
    let height = metadata.height || MAX_HEIGHT;

    if (width > MAX_WIDTH || height > MAX_HEIGHT) {
      const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    // Convert to WebP and optimize
    const optimized = await image
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: QUALITY })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: optimized.data,
      format: "webp",
      width: optimized.info.width,
      height: optimized.info.height,
      size: optimized.info.size,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Image optimization failed: ${error.message}`);
    }
    throw new Error("Failed to optimize image");
  }
}

/**
 * Download and optimize an image from a URL
 * @param url - URL of the image to download
 * @returns Optimized image buffer and metadata
 * @throws Error if download or optimization fails
 */
export async function downloadAndOptimizeImage(url: string): Promise<OptimizedImage> {
  // Validate URL
  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Invalid protocol (only HTTP/HTTPS supported)");
    }
  } catch (error) {
    throw new Error("Invalid image URL");
  }

  // Download the image
  const downloadedBuffer = await downloadImage(url);

  // Check size before optimization
  if (downloadedBuffer.length > MAX_FILE_SIZE * 2) {
    throw new Error("Image too large (>10MB)");
  }

  // Optimize the image
  const optimized = await optimizeImage(downloadedBuffer);

  // Verify final size
  if (optimized.size > MAX_FILE_SIZE) {
    throw new Error("Optimized image still exceeds size limit");
  }

  return optimized;
}

/**
 * Convert an optimized image buffer to a base64 data URI
 */
export function imageToDataUri(buffer: Buffer, format: string = "webp"): string {
  const base64 = buffer.toString("base64");
  return `data:image/${format};base64,${base64}`;
}
