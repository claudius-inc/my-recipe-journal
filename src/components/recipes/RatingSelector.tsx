"use client";

import React from "react";

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
          <button
            key={star}
            onClick={() => onChange(value === star ? undefined : star)}
            disabled={disabled}
            className={`text-2xl transition-colors ${
              star <= (value ?? 0)
                ? "text-yellow-400 hover:text-yellow-500"
                : "text-gray-300 hover:text-yellow-300"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={`${star} star${star !== 1 ? "s" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
      {value && <span className="text-sm text-gray-600">({value}/5)</span>}
    </div>
  );
}
