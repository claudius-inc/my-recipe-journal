"use client";

import React, { useState } from "react";
import { RatingSelector } from "./RatingSelector";
import { TagSelector } from "./TagSelector";
import type { RecipeVersion } from "@/types/recipes";

interface SuccessMetricsProps {
  version: RecipeVersion;
  onSave: (data: {
    tasteRating?: number;
    visualRating?: number;
    textureRating?: number;
    tasteTags: string[];
    textureTags: string[];
  }) => Promise<void>;
  isSaving?: boolean;
}

export function SuccessMetrics({
  version,
  onSave,
  isSaving = false,
}: SuccessMetricsProps) {
  const [tasteRating, setTasteRating] = useState<number | undefined>(version.tasteRating);
  const [visualRating, setVisualRating] = useState<number | undefined>(
    version.visualRating,
  );
  const [textureRating, setTextureRating] = useState<number | undefined>(
    version.textureRating,
  );
  const [tasteTags, setTasteTags] = useState<string[]>(version.tasteTags ?? []);
  const [textureTags, setTextureTags] = useState<string[]>(version.textureTags ?? []);
  const [showForm, setShowForm] = useState(false);

  const hasRatings = tasteRating || visualRating || textureRating;

  const handleSave = async () => {
    await onSave({
      tasteRating,
      visualRating,
      textureRating,
      tasteTags,
      textureTags,
    });
    setShowForm(false);
  };

  const handleCancel = () => {
    setTasteRating(version.tasteRating);
    setVisualRating(version.visualRating);
    setTextureRating(version.textureRating);
    setTasteTags(version.tasteTags ?? []);
    setTextureTags(version.textureTags ?? []);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Success Metrics</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            {hasRatings ? "Edit" : "Rate this version"}
          </button>
        )}
      </div>

      {!showForm && hasRatings && (
        <div className="bg-blue-50 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-3 gap-4">
            {tasteRating && (
              <div className="text-sm">
                <div className="text-gray-600">Taste</div>
                <div className="text-xl">
                  {"★".repeat(tasteRating)}
                  {"☆".repeat(5 - tasteRating)}
                </div>
              </div>
            )}
            {visualRating && (
              <div className="text-sm">
                <div className="text-gray-600">Visual</div>
                <div className="text-xl">
                  {"★".repeat(visualRating)}
                  {"☆".repeat(5 - visualRating)}
                </div>
              </div>
            )}
            {textureRating && (
              <div className="text-sm">
                <div className="text-gray-600">Texture</div>
                <div className="text-xl">
                  {"★".repeat(textureRating)}
                  {"☆".repeat(5 - textureRating)}
                </div>
              </div>
            )}
          </div>

          {(tasteTags.length > 0 || textureTags.length > 0) && (
            <div className="space-y-2 mt-3 pt-3 border-t border-blue-200">
              {tasteTags.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1 font-medium">Taste</div>
                  <div className="flex flex-wrap gap-1">
                    {tasteTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {textureTags.length > 0 && (
                <div>
                  <div className="text-xs text-gray-600 mb-1 font-medium">Texture</div>
                  <div className="flex flex-wrap gap-1">
                    {textureTags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
          <RatingSelector
            label="Taste"
            value={tasteRating}
            onChange={setTasteRating}
            disabled={isSaving}
          />
          <RatingSelector
            label="Visual"
            value={visualRating}
            onChange={setVisualRating}
            disabled={isSaving}
          />
          <RatingSelector
            label="Texture"
            value={textureRating}
            onChange={setTextureRating}
            disabled={isSaving}
          />

          <div className="border-t border-gray-300 pt-4">
            <TagSelector
              label="Taste Tags"
              value={tasteTags}
              onChange={setTasteTags}
              type="taste"
              disabled={isSaving}
            />
          </div>

          <TagSelector
            label="Texture Tags"
            value={textureTags}
            onChange={setTextureTags}
            type="texture"
            disabled={isSaving}
          />

          <div className="flex gap-2 justify-end pt-4 border-t border-gray-300">
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Metrics"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
