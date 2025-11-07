"use client";

import React from "react";
import type { RecipeVersion, Ingredient } from "@/types/recipes";

interface VersionComparisonModalProps {
  isOpen: boolean;
  baseVersion: RecipeVersion;
  comparisonVersion: RecipeVersion;
  onClose: () => void;
  flourTotal?: number;
}

interface IngredientDiff {
  ingredient: Ingredient;
  previousQuantity: number | null;
  previousUnit: string | null;
  changePercent?: number;
  isNew: boolean;
  isRemoved: boolean;
}

export function VersionComparisonModal({
  isOpen,
  baseVersion,
  comparisonVersion,
  onClose,
  flourTotal = 0,
}: VersionComparisonModalProps) {
  if (!isOpen) {
    return null;
  }

  // Build a map of ingredients by name for the base version
  const baseIngredientMap = new Map<string, Ingredient>();
  baseVersion.ingredients.forEach((ing) => {
    baseIngredientMap.set(ing.name.toLowerCase(), ing);
  });

  // Find all ingredient differences
  const diffs: IngredientDiff[] = [];
  const processedIngredients = new Set<string>();

  // Check each ingredient in the comparison version
  comparisonVersion.ingredients.forEach((ing) => {
    const baseIng = baseIngredientMap.get(ing.name.toLowerCase());
    const keyLower = ing.name.toLowerCase();
    processedIngredients.add(keyLower);

    if (!baseIng) {
      // New ingredient
      diffs.push({
        ingredient: ing,
        previousQuantity: null,
        previousUnit: null,
        isNew: true,
        isRemoved: false,
      });
    } else {
      // Check if quantity or unit changed
      const quantityChanged = baseIng.quantity !== ing.quantity;
      const unitChanged = baseIng.unit !== ing.unit;

      if (quantityChanged || unitChanged) {
        const changePercent =
          baseIng.quantity > 0
            ? ((ing.quantity - baseIng.quantity) / baseIng.quantity) * 100
            : 0;
        diffs.push({
          ingredient: ing,
          previousQuantity: baseIng.quantity,
          previousUnit: baseIng.unit,
          changePercent,
          isNew: false,
          isRemoved: false,
        });
      }
    }
  });

  // Check for removed ingredients
  baseVersion.ingredients.forEach((ing) => {
    const keyLower = ing.name.toLowerCase();
    if (!processedIngredients.has(keyLower)) {
      diffs.push({
        ingredient: ing,
        previousQuantity: ing.quantity,
        previousUnit: ing.unit,
        isNew: false,
        isRemoved: true,
      });
    }
  });

  const hasChanges = diffs.length > 0;

  const getChangeColor = (percent: number | undefined): string => {
    if (percent === undefined) return "";
    if (percent > 0) return "text-red-600 dark:text-red-400"; // Increased
    if (percent < 0) return "text-blue-600 dark:text-blue-400"; // Decreased
    return "";
  };

  const getChangeArrow = (percent: number | undefined): string => {
    if (percent === undefined) return "";
    if (percent > 0) return "↑";
    if (percent < 0) return "↓";
    return "";
  };

  const getBakersPercentage = (ingredient: Ingredient): string => {
    if (flourTotal <= 0) return "—";
    const percent = (ingredient.quantity / flourTotal) * 100;
    return `${(Math.round(percent * 10) / 10).toFixed(1)}%`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-auto dark:bg-neutral-900">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-neutral-50">
              Version Comparison
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-neutral-400 dark:hover:text-neutral-200 text-2xl leading-none"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-600 dark:text-neutral-400">
            Comparing: <span className="font-medium">{baseVersion.title}</span> →{" "}
            <span className="font-medium">{comparisonVersion.title}</span>
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          {!hasChanges ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-neutral-400">
                No ingredient changes between these versions.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Column headers for wide screens */}
              <div className="hidden md:grid md:grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-neutral-700">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-neutral-300">
                    Ingredient
                  </h3>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-neutral-300">
                    {baseVersion.title}
                  </h3>
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-neutral-300">
                    {comparisonVersion.title}
                  </h3>
                </div>
              </div>

              {/* Ingredient diffs */}
              <div className="space-y-4">
                {diffs.map((diff) => (
                  <div
                    key={diff.ingredient.id}
                    className={`p-4 rounded-lg border ${
                      diff.isNew
                        ? "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-900/20"
                        : diff.isRemoved
                          ? "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20"
                          : "border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20"
                    }`}
                  >
                    {/* Mobile view */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-neutral-50">
                            {diff.ingredient.name}
                          </h4>
                          <p className="text-xs text-gray-600 dark:text-neutral-400 mt-1">
                            Role: {diff.ingredient.role}
                          </p>
                        </div>
                        <span
                          className={`text-sm font-semibold px-2 py-1 rounded ${
                            diff.isNew
                              ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : diff.isRemoved
                                ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                                : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }`}
                        >
                          {diff.isNew ? "New" : diff.isRemoved ? "Removed" : "Changed"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-neutral-400 font-medium">
                            {baseVersion.title}
                          </p>
                          {diff.previousQuantity !== null ? (
                            <>
                              <p className="font-mono text-gray-700 dark:text-neutral-300">
                                {diff.previousQuantity.toFixed(1)} {diff.previousUnit}
                              </p>
                              {flourTotal > 0 && (
                                <p className="text-xs text-gray-500 dark:text-neutral-500">
                                  {getBakersPercentage({
                                    ...diff.ingredient,
                                    quantity: diff.previousQuantity,
                                  })}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-gray-500 dark:text-neutral-400 italic">
                              —
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-neutral-400 font-medium">
                            {comparisonVersion.title}
                          </p>
                          <p className="font-mono text-gray-700 dark:text-neutral-300">
                            {diff.ingredient.quantity.toFixed(1)} {diff.ingredient.unit}
                          </p>
                          {flourTotal > 0 && (
                            <p className="text-xs text-gray-500 dark:text-neutral-500">
                              {getBakersPercentage(diff.ingredient)}
                            </p>
                          )}
                        </div>
                      </div>

                      {diff.changePercent !== undefined && (
                        <div className="flex items-center gap-2 pt-2">
                          <span
                            className={`font-semibold ${getChangeColor(
                              diff.changePercent,
                            )}`}
                          >
                            {getChangeArrow(diff.changePercent)}{" "}
                            {Math.abs(diff.changePercent).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Desktop view */}
                    <div className="hidden md:grid md:grid-cols-3 gap-4 items-center">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-neutral-50">
                          {diff.ingredient.name}
                        </h4>
                        <p className="text-xs text-gray-600 dark:text-neutral-400 mt-1">
                          {diff.ingredient.role}
                        </p>
                      </div>

                      <div className="text-center">
                        {diff.previousQuantity !== null ? (
                          <>
                            <p className="font-mono text-gray-700 dark:text-neutral-300">
                              {diff.previousQuantity.toFixed(1)} {diff.previousUnit}
                            </p>
                            {flourTotal > 0 && (
                              <p className="text-xs text-gray-500 dark:text-neutral-500">
                                {getBakersPercentage({
                                  ...diff.ingredient,
                                  quantity: diff.previousQuantity,
                                })}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-gray-500 dark:text-neutral-400 italic">—</p>
                        )}
                      </div>

                      <div className="text-center">
                        <p className="font-mono text-gray-700 dark:text-neutral-300">
                          {diff.ingredient.quantity.toFixed(1)} {diff.ingredient.unit}
                        </p>
                        {flourTotal > 0 && (
                          <p className="text-xs text-gray-500 dark:text-neutral-500">
                            {getBakersPercentage(diff.ingredient)}
                          </p>
                        )}
                        {diff.changePercent !== undefined && (
                          <p
                            className={`text-sm font-semibold mt-1 ${getChangeColor(
                              diff.changePercent,
                            )}`}
                          >
                            {getChangeArrow(diff.changePercent)}{" "}
                            {Math.abs(diff.changePercent).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Badge for change type */}
                    <div className="hidden md:block mt-2">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded inline-block ${
                          diff.isNew
                            ? "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : diff.isRemoved
                              ? "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {diff.isNew
                          ? "New ingredient"
                          : diff.isRemoved
                            ? "Removed ingredient"
                            : "Quantity changed"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary stats */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-neutral-700">
                <h3 className="font-semibold text-gray-900 dark:text-neutral-50 mb-3">
                  Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-neutral-400">Changed</p>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {diffs.filter((d) => !d.isNew && !d.isRemoved).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-neutral-400">New</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {diffs.filter((d) => d.isNew).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-neutral-400">Removed</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {diffs.filter((d) => d.isRemoved).length}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-neutral-400">Total</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-neutral-50">
                      {diffs.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
