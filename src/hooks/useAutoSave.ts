"use client";

import { useEffect, useRef, useState } from "react";

interface UseAutoSaveOptions {
  delay?: number;
  onSave: () => Promise<void>;
}

export function useAutoSave({ delay = 500, onSave }: UseAutoSaveOptions) {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const triggerSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const markDirty = () => {
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      triggerSave();
    }, delay);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    hasUnsavedChanges,
    markDirty,
    triggerSave,
  };
}
