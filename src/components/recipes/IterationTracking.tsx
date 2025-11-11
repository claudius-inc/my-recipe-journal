"use client";

import React, { useState } from "react";
import { Button, TextField, TextArea } from "@radix-ui/themes";
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
          <Button variant="soft" size="1" onClick={() => setIsEditing(true)}>
            {hasIterationData ? "Edit" : "Add tracking"}
          </Button>
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
            <TextField.Root
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
            <TextArea
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
            <TextArea
              value={outcome}
              onChange={(e) => setOutcome(e.target.value)}
              placeholder="Record what you observed - crumb structure, rise, taste, etc"
              rows={2}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-400 focus:ring-2 focus:ring-gray-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              disabled={isSaving}
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="1" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="1" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
