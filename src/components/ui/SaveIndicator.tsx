"use client";

import React, { useEffect, useState } from "react";
import { Spinner } from "@radix-ui/themes";

interface SaveIndicatorProps {
  isSaving: boolean;
  onSaveComplete?: () => void;
}

export function SaveIndicator({ isSaving, onSaveComplete }: SaveIndicatorProps) {
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isSaving) {
      setIsVisible(true);
      setShowCheckmark(false);
    } else if (isVisible && !isSaving) {
      // Transition from spinner to checkmark
      setShowCheckmark(true);

      // After 2 seconds, start fading out
      const fadeTimer = setTimeout(() => {
        setIsVisible(false);
        onSaveComplete?.();
      }, 2000);

      return () => clearTimeout(fadeTimer);
    }
  }, [isSaving, isVisible, onSaveComplete]);

  if (!isVisible) return null;

  return (
    <div className="inline-flex items-center">
      {!showCheckmark ? (
        // Spinner
        <Spinner size="1" />
      ) : (
        // Checkmark with fade-out animation
        <div className="animate-fadeOut">
          <svg
            className="w-4 h-4 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
