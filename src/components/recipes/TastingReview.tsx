"use client";

import React, { useState } from "react";
import { Button, TextArea } from "@radix-ui/themes";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { RatingSelector } from "./RatingSelector";
import { TagSelector } from "./TagSelector";
import type { RecipeVersion } from "@/types/recipes";

interface TastingReviewProps {
  version: RecipeVersion;
  onSave: (data: {
    tastingNotes: string;
    tasteRating?: number;
    visualRating?: number;
    textureRating?: number;
    tasteTags: string[];
    textureTags: string[];
  }) => Promise<void>;
  isSaving?: boolean;
}

export function TastingReview({ version, onSave, isSaving = false }: TastingReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [tastingNotes, setTastingNotes] = useState(version.tastingNotes || "");
  const [tasteRating, setTasteRating] = useState<number | undefined>(version.tasteRating);
  const [visualRating, setVisualRating] = useState<number | undefined>(
    version.visualRating,
  );
  const [textureRating, setTextureRating] = useState<number | undefined>(
    version.textureRating,
  );
  const [tasteTags, setTasteTags] = useState<string[]>(version.tasteTags ?? []);
  const [textureTags, setTextureTags] = useState<string[]>(version.textureTags ?? []);

  const hasData =
    version.tastingNotes ||
    version.tasteRating ||
    version.visualRating ||
    version.textureRating;

  const handleSave = async () => {
    await onSave({
      tastingNotes,
      tasteRating,
      visualRating,
      textureRating,
      tasteTags,
      textureTags,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTastingNotes(version.tastingNotes || "");
    setTasteRating(version.tasteRating);
    setVisualRating(version.visualRating);
    setTextureRating(version.textureRating);
    setTasteTags(version.tasteTags ?? []);
    setTextureTags(version.textureTags ?? []);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            Tasting review
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Rate the results and capture what worked and what didn&apos;t
          </p>
        </div>
        {!isEditing && (
          <Button variant="outline" size="1" onClick={() => setIsEditing(true)}>
            {hasData ? "Edit review" : "Add review"}
          </Button>
        )}
      </div>

      {!isEditing && hasData && (
        <div className="space-y-4">
          {/* Ratings display */}
          {(tasteRating || visualRating || textureRating) && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800/60 dark:bg-blue-900/20">
              <div className="grid grid-cols-3 gap-4">
                {tasteRating && (
                  <div className="text-center">
                    <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Taste
                    </div>
                    <div className="mt-1 flex gap-0.5 justify-center text-amber-500">
                      {Array.from({ length: tasteRating }).map((_, i) => (
                        <StarFilledIcon key={`filled-${i}`} className="w-5 h-5" />
                      ))}
                      <span className="text-neutral-300 dark:text-neutral-600 flex gap-0.5">
                        {Array.from({ length: 5 - tasteRating }).map((_, i) => (
                          <StarIcon key={`empty-${i}`} className="w-5 h-5" />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                {visualRating && (
                  <div className="text-center">
                    <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Visual
                    </div>
                    <div className="mt-1 flex gap-0.5 justify-center text-amber-500">
                      {Array.from({ length: visualRating }).map((_, i) => (
                        <StarFilledIcon key={`filled-${i}`} className="w-5 h-5" />
                      ))}
                      <span className="text-neutral-300 dark:text-neutral-600 flex gap-0.5">
                        {Array.from({ length: 5 - visualRating }).map((_, i) => (
                          <StarIcon key={`empty-${i}`} className="w-5 h-5" />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
                {textureRating && (
                  <div className="text-center">
                    <div className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Texture
                    </div>
                    <div className="mt-1 flex gap-0.5 justify-center text-amber-500">
                      {Array.from({ length: textureRating }).map((_, i) => (
                        <StarFilledIcon key={`filled-${i}`} className="w-5 h-5" />
                      ))}
                      <span className="text-neutral-300 dark:text-neutral-600 flex gap-0.5">
                        {Array.from({ length: 5 - textureRating }).map((_, i) => (
                          <StarIcon key={`empty-${i}`} className="w-5 h-5" />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags display */}
              {(tasteTags.length > 0 || textureTags.length > 0) && (
                <div className="mt-3 space-y-2 border-t border-blue-200 pt-3 dark:border-blue-800/60">
                  {tasteTags.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Taste
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tasteTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-200 px-2 py-1 text-xs text-blue-800 dark:bg-blue-800/40 dark:text-blue-200"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {textureTags.length > 0 && (
                    <div>
                      <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                        Texture
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {textureTags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-blue-200 px-2 py-1 text-xs text-blue-800 dark:bg-blue-800/40 dark:text-blue-200"
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

          {/* Tasting notes text */}
          {version.tastingNotes && (
            <div className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-900">
              <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                {version.tastingNotes}
              </p>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <div className="space-y-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-700 dark:bg-neutral-900/60">
          {/* Ratings */}
          <div className="space-y-3">
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
          </div>

          {/* Tags */}
          <div className="space-y-3 border-t border-neutral-300 pt-4 dark:border-neutral-600">
            <TagSelector
              label="Taste Tags"
              value={tasteTags}
              onChange={setTasteTags}
              type="taste"
              disabled={isSaving}
            />
            <TagSelector
              label="Texture Tags"
              value={textureTags}
              onChange={setTextureTags}
              type="texture"
              disabled={isSaving}
            />
          </div>

          {/* Tasting notes textarea */}
          <div className="border-t border-neutral-300 pt-4 dark:border-neutral-600">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Tasting notes
            </label>
            <TextArea
              value={tastingNotes}
              onChange={(e) => setTastingNotes(e.target.value)}
              rows={4}
              placeholder="What worked? Where did it fall short? Describe flavors, appearance, and texture..."
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
              disabled={isSaving}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 border-t border-neutral-300 pt-4 dark:border-neutral-600">
            <Button variant="outline" size="2" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="2" onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save review"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
