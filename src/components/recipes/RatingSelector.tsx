"use client";

import React from "react";
import { IconButton, Tooltip } from "@radix-ui/themes";

interface RatingSelectorProps {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  disabled?: boolean;
}

export function RatingSelector({
  label,
  value,
  onChange,
  disabled = false,
}: RatingSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-gray-700 min-w-fit">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Tooltip key={star} content={`${star} star${star !== 1 ? "s" : ""}`}>
            <IconButton
              variant="ghost"
              size="1"
              className={`!p-1 !h-auto text-2xl transition-colors ${
                star <= (value ?? 0)
                  ? "text-yellow-400 hover:text-yellow-500"
                  : "text-gray-300 hover:text-yellow-300"
              }`}
              onClick={() => onChange(value === star ? undefined : star)}
              disabled={disabled}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
            >
              ★
            </IconButton>
          </Tooltip>
        ))}
      </div>
      {value && <span className="text-sm text-gray-600">({value}/5)</span>}
    </div>
  );
}
