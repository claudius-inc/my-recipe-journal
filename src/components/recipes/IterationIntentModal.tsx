"use client";

import React, { useState } from "react";
import { Button } from "@radix-ui/themes";
import type { RecipeVersion } from "@/types/recipes";

interface IterationIntentModalProps {
  isOpen: boolean;
  baseVersion: RecipeVersion;
  onConfirm: (data: {
    iterationIntent: string;
    hypothesis?: string;
    baseVersionId: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const COMMON_INTENTS = [
  "Test ingredient substitution",
  "Adjust hydration level",
  "Improve texture",
  "Faster fermentation",
  "Better flavor development",
  "Reduce ingredients",
  "Scale recipe",
  "Equipment experiment",
];

export function IterationIntentModal({
  isOpen,
  baseVersion,
  onConfirm,
  onCancel,
  isLoading = false,
}: IterationIntentModalProps) {
  const [intent, setIntent] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [useQuickStart, setUseQuickStart] = useState(false);

  const handleSubmit = async () => {
    if (!intent.trim()) {
      return;
    }

    await onConfirm({
      iterationIntent: intent.trim(),
      hypothesis: hypothesis.trim() || undefined,
      baseVersionId: baseVersion.id,
    });

    // Reset form
    setIntent("");
    setHypothesis("");
  };

  const handleQuickIntent = (quickIntent: string) => {
    setIntent(quickIntent);
    setUseQuickStart(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6 dark:bg-neutral-900">
        <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-neutral-50">
          Create New Version
        </h2>
        <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
          Based on: <span className="font-medium">{baseVersion.title || "Untitled"}</span>
        </p>

        <div className="space-y-4">
          {/* Intent Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              What are you testing or changing?
            </label>
            <textarea
              value={intent}
              onChange={(e) => {
                setIntent(e.target.value);
                setUseQuickStart(false);
              }}
              onFocus={() => setUseQuickStart(true)}
              placeholder="e.g., Testing higher hydration or trying a new flour brand"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />

            {/* Quick intent suggestions */}
            {useQuickStart && intent.length === 0 && (
              <div className="mt-2 space-y-2">
                <p className="text-xs text-gray-500">Quick options:</p>
                <div className="flex flex-wrap gap-1">
                  {COMMON_INTENTS.map((quickIntent) => (
                    <Button
                      key={quickIntent}
                      variant="soft"
                      size="1"
                      onClick={() => handleQuickIntent(quickIntent)}
                    >
                      {quickIntent}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hypothesis Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">
              Your hypothesis (optional)
            </label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="e.g., I think increasing hydration to 75% will improve the open crumb"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="soft"
              size="3"
              className="flex-1"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              size="3"
              className="flex-1"
              onClick={handleSubmit}
              disabled={!intent.trim() || isLoading}
            >
              {isLoading ? "Creating..." : "Create Version"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
