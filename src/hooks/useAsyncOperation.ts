"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/context/ToastContext";

interface UseAsyncOperationOptions {
  onSuccess?: (data?: any) => void;
  onError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  maxRetries?: number;
}

export function useAsyncOperation(options: UseAsyncOperationOptions = {}) {
  const {
    onSuccess,
    onError,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = "Operation successful",
    errorMessage = "Operation failed",
    maxRetries = 1,
  } = options;

  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async <T>(operation: () => Promise<T>, retryCount = 0): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await operation();

        if (showSuccessToast) {
          addToast(successMessage, "success");
        }

        onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);

        // Retry logic
        if (retryCount < maxRetries) {
          console.warn(
            `Operation failed, retrying... (attempt ${retryCount + 1}/${maxRetries})`,
          );
          return execute(operation, retryCount + 1);
        }

        if (showErrorToast) {
          addToast(errorMessage, "error");
        }

        onError?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [
      addToast,
      onSuccess,
      onError,
      showSuccessToast,
      showErrorToast,
      successMessage,
      errorMessage,
      maxRetries,
    ],
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    isLoading,
    error,
    execute,
    reset,
  };
}
