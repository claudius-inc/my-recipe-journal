"use client";

import React, { useState } from "react";
import type { RecipeVersion } from "@/types/recipes";

interface IterationTrackingProps {
  version: RecipeVersion;
  onSave: (data: {
    iterationIntent?: string;
    hypothesis?: string;
    outcome?: string;
  }) => Promise<void>;
  isSaving?: boolean;
}

export function IterationTracking({
  version,
  onSave,
  isSaving = false,
}: IterationTrackingProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [iterationIntent, setIterationIntent] = useState(version.iterationIntent || "");
  const [hypothesis, setHypothesis] = useState(version.hypothesis || "");
  const [outcome, setOutcome] = useState(version.outcome || "");

  const handleSave = async () => {
    await onSave({
      iterationIntent: iterationIntent || undefined,
      hypothesis: hypothesis || undefined,
      outcome: outcome || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIterationIntent(version.iterationIntent || "");
    setHypothesis(version.hypothesis || "");
    setOutcome(version.outcome || "");
    setIsEditing(false);
  };

  const hasIterationData =
    version.iterationIntent || version.hypothesis || version.outcome;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
          Iteration Tracking
        </h3>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
          >
            {hasIterationData ? "Edit" : "Add tracking"}
          </button>
        )}
      </div>

      {!isEditing && hasIterationData && (
        <div className="bg-amber-50 rounded-lg p-3 space-y-2 dark:bg-amber-900/20">
          {version.iterationIntent && (
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Intent
              </div>
              <p className="text-sm text-gray-700 dark:text-neutral-300">
                {version.iterationIntent}
              </p>
            </div>
          )}
          {version.hypothesis && (
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Hypothesis
              </div>
              <p className="text-sm text-gray-700 dark:text-neutral-300">
                {version.hypothesis}
              </p>
            </div>
          )}
          {version.outcome && (
            <div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Outcome
              </div>
              <p className="text-sm text-gray-700 dark:text-neutral-300">
                {version.outcome}
              </p>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-3 border border-gray-200 dark:bg-neutral-800 dark:border-neutral-700">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              What were you testing?
            </label>
            <input
              type="text"
              value={iterationIntent}
              onChange={(e) => setIterationIntent(e.target.value)}
              placeholder="e.g., Testing 75% hydration"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              Your hypothesis
            </label>
            <textarea
              value={hypothesis}
              onChange={(e) => setHypothesis(e.target.value)}
              placeholder="What did you expect would happen?"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              disabled={isSaving}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-neutral-300 mb-1">
              What actually happened?
            </label>
            <textarea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Record what you observed - crumb structure, rise, taste, etc"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-3 py-1 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-600 dark:hover:bg-neutral-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
