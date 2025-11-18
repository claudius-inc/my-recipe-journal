"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button, TextArea, Spinner } from "@radix-ui/themes";
import { StarFilledIcon, StarIcon } from "@radix-ui/react-icons";
import { SaveIndicator } from "@/components/ui/SaveIndicator";

export interface VersionNotesProps {
  notesDraft: {
    notes: string;
    nextSteps: string;
    tasteNotes: string;
    visualNotes: string;
    textureNotes: string;
  };
  tasteRating?: number;
  visualRating?: number;
  textureRating?: number;
  onRatingChange: (
    field: "tasteRating" | "visualRating" | "textureRating",
    value: number,
  ) => Promise<void>;
  onChange: (value: VersionNotesProps["notesDraft"]) => void;
  onSave: (field: keyof VersionNotesProps["notesDraft"], value: string) => Promise<void>;
  savingNotes?: Record<string, boolean>;
  savingRating: string | null;
  hoverRating: {
    field: string | null;
    value: number | null;
  };
  setHoverRating: (value: { field: string | null; value: number | null }) => void;
}

export function RecipeVersionNotes({
  notesDraft,
  onChange,
  onSave,
  savingNotes = {},
  tasteRating,
  visualRating,
  textureRating,
  onRatingChange,
  savingRating,
  hoverRating,
  setHoverRating,
}: VersionNotesProps) {
  const [editingRatingNote, setEditingRatingNote] = useState<
    "taste" | "visual" | "texture" | null
  >(null);
  const [ratingNoteDraft, setRatingNoteDraft] = useState("");

  const ratings: Array<{
    key: "taste" | "visual" | "texture";
    label: string;
    rating?: number;
    note?: string;
    noteField: "tasteNotes" | "visualNotes" | "textureNotes";
    ratingField: "tasteRating" | "visualRating" | "textureRating";
  }> = [
    {
      key: "taste",
      label: "Taste",
      rating: tasteRating,
      note: notesDraft.tasteNotes,
      noteField: "tasteNotes",
      ratingField: "tasteRating",
    },
    {
      key: "visual",
      label: "Visual",
      rating: visualRating,
      note: notesDraft.visualNotes,
      noteField: "visualNotes",
      ratingField: "visualRating",
    },
    {
      key: "texture",
      label: "Texture",
      rating: textureRating,
      note: notesDraft.textureNotes,
      noteField: "textureNotes",
      ratingField: "textureRating",
    },
  ];

  const handleAddNote = (key: "taste" | "visual" | "texture", currentNote?: string) => {
    setEditingRatingNote(key);
    setRatingNoteDraft(currentNote || "");
  };

  const handleSaveRatingNote = async (
    noteField: "tasteNotes" | "visualNotes" | "textureNotes",
  ) => {
    await onSave(noteField, ratingNoteDraft);
    setEditingRatingNote(null);
    setRatingNoteDraft("");
  };

  const handleCancelRatingNote = () => {
    setEditingRatingNote(null);
    setRatingNoteDraft("");
  };

  const handleRemoveRatingNote = async (
    noteField: "tasteNotes" | "visualNotes" | "textureNotes",
  ) => {
    await onSave(noteField, "");
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
        Version journal
      </h3>
      <div className="mt-3 grid gap-6">
        {/* Process Notes */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Process notes
            </label>
            <SaveIndicator isSaving={savingNotes["notes"] ?? false} />
          </div>
          <TextArea
            value={notesDraft.notes}
            onChange={(event) => onChange({ ...notesDraft, notes: event.target.value })}
            onBlur={(event) => onSave("notes", event.target.value)}
            rows={4}
            placeholder="Observations during mixing, fermentation, shaping, or baking."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Observations during mixing, fermentation, shaping, or baking.
          </p>
        </div>

        {/* Taste Review */}
        <div className="grid gap-3">
          <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Taste Review
          </label>
          {ratings.map(({ key, label, rating, note, noteField, ratingField }) => (
            <div key={key} className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {/* Star Rating */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const isLoading = savingRating === ratingField;
                      const displayRating =
                        hoverRating.field === ratingField && hoverRating.value !== null
                          ? hoverRating.value
                          : (rating ?? 0);
                      const isFilled = i < displayRating;

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={isLoading}
                          onMouseEnter={() =>
                            setHoverRating({ field: ratingField, value: i + 1 })
                          }
                          onMouseLeave={() =>
                            setHoverRating({ field: null, value: null })
                          }
                          onClick={() => {
                            const newRating = i + 1;
                            // Toggle to clear: if clicking current rating, set to 0
                            if (rating === newRating) {
                              onRatingChange(ratingField, 0);
                            } else {
                              onRatingChange(ratingField, newRating);
                            }
                          }}
                          className={cn(
                            "p-2 -m-2 touch-manipulation cursor-pointer transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 rounded",
                            isLoading && "opacity-50 cursor-wait",
                            !isLoading && "hover:scale-110",
                          )}
                          aria-label={`Rate ${label} ${i + 1} out of 5 stars${
                            rating === i + 1 ? ". Click again to clear rating" : ""
                          }`}
                        >
                          {isFilled ? (
                            <StarFilledIcon
                              className={cn(
                                "w-6 h-6 text-amber-500 transition-all duration-200",
                                isLoading && "animate-pulse",
                              )}
                            />
                          ) : (
                            <StarIcon className="w-6 h-6 text-amber-500 opacity-40 transition-all duration-200" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Fixed space for spinner - prevents layout shift */}
                  <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <Spinner
                      size="1"
                      className={cn(
                        "transition-opacity duration-200",
                        savingRating === ratingField ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>
                  {/* Note Button */}
                  {!note && editingRatingNote !== key && (
                    <Button
                      variant="ghost"
                      size="1"
                      onClick={() => handleAddNote(key, note)}
                    >
                      + Note
                    </Button>
                  )}
                </div>
              </div>

              {/* Show existing note */}
              {note && editingRatingNote !== key && (
                <div className="ml-0 mt-1">
                  <div className="flex items-start justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 flex-1">
                      {note}
                    </p>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="1"
                        onClick={() => handleAddNote(key, note)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="1"
                        color="red"
                        onClick={() => handleRemoveRatingNote(noteField)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Editing note */}
              {editingRatingNote === key && (
                <div className="ml-0 mt-1 grid gap-2">
                  <TextArea
                    value={ratingNoteDraft}
                    onChange={(event) => setRatingNoteDraft(event.target.value)}
                    rows={2}
                    placeholder={`Notes on ${label.toLowerCase()}`}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      size="1"
                      onClick={() => handleSaveRatingNote(noteField)}
                      disabled={savingNotes[noteField] ?? false}
                    >
                      {savingNotes[noteField] ? "Saving..." : "Save"}
                    </Button>
                    <Button size="1" variant="ghost" onClick={handleCancelRatingNote}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Next Iteration Plan */}
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              Next iteration plan
            </label>
            <SaveIndicator isSaving={savingNotes["nextSteps"] ?? false} />
          </div>
          <TextArea
            value={notesDraft.nextSteps}
            onChange={(event) =>
              onChange({ ...notesDraft, nextSteps: event.target.value })
            }
            onBlur={(event) => onSave("nextSteps", event.target.value)}
            rows={4}
            placeholder="Call out the next tweaks to try, schedules to adjust, or ingredients to swap."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
          />
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            Call out the next tweaks to try, schedules to adjust, or ingredients to swap.
          </p>
        </div>
      </div>
    </section>
  );
}
