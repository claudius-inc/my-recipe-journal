"use client";

import React, { useEffect, useState } from "react";

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
        <div className="animate-spin">
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
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
