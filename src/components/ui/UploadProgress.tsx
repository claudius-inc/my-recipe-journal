"use client";

import React from "react";

interface UploadProgressProps {
  isUploading: boolean;
  progress: number; // 0-100
  fileName?: string;
  error?: string;
}

export function UploadProgress({
  isUploading,
  progress,
  fileName,
  error,
}: UploadProgressProps) {
  if (!isUploading && !error) return null;

  return (
    <div className="w-full space-y-2">
      {fileName && (
        <div className="text-sm text-gray-600 dark:text-gray-400">{fileName}</div>
      )}

      {error ? (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Uploading…</span>
            <span className="font-medium text-gray-900 dark:text-white">{progress}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}
