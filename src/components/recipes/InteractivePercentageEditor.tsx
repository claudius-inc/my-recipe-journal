"use client";

import React, { useState, useRef, useEffect } from "react";
import { TextField } from "@radix-ui/themes";
import { CheckIcon, Cross2Icon } from "@radix-ui/react-icons";
import type { Ingredient } from "@/types/recipes";
import { SaveIndicator } from "../ui/SaveIndicator";

interface InteractivePercentageEditorProps {
  ingredient: Ingredient;
  flourTotal: number;
  onSave: (newQuantity: number) => Promise<void>;
  isSaving?: boolean;
  disabled?: boolean;
}

export function InteractivePercentageEditor({
  ingredient,
  flourTotal,
  onSave,
  isSaving = false,
  disabled = false,
}: InteractivePercentageEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [percentageInput, setPercentageInput] = useState("");
  const [newQuantity, setNewQuantity] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPercentage = flourTotal > 0 ? (ingredient.quantity / flourTotal) * 100 : 0;
  const formattedPercentage = `${(Math.round(currentPercentage * 10) / 10).toFixed(1)}%`;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.select();
    }
  }, [isEditing]);

  const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPercentageInput(value);

    // Calculate new quantity based on percentage
    if (value && !isNaN(Number(value)) && flourTotal > 0) {
      const newQty = (Number(value) / 100) * flourTotal;
      setNewQuantity(newQty);
    }
  };

  const handleSave = async () => {
    if (!percentageInput || isNaN(Number(percentageInput)) || newQuantity <= 0) {
      setIsEditing(false);
      return;
    }

    await onSave(Number(newQuantity.toFixed(1)));
    setIsEditing(false);
    setPercentageInput("");
  };

  const handleCancel = () => {
    setIsEditing(false);
    setPercentageInput("");
    setNewQuantity(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1">
          <TextField.Root
            ref={inputRef}
            type="number"
            value={percentageInput}
            onChange={handlePercentageChange}
            onKeyDown={handleKeyDown}
            placeholder="0.0"
            disabled={isSaving}
            step="0.1"
            className="w-16 rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-60 disabled:cursor-not-allowed dark:border-blue-700 dark:bg-blue-900 dark:text-neutral-50"
          />
          <span className="text-sm text-gray-600 dark:text-neutral-400">%</span>
        </div>
        {newQuantity > 0 && (
          <span className="text-xs text-gray-500 dark:text-neutral-500">
            = {newQuantity.toFixed(1)}
            {ingredient.unit}
          </span>
        )}
        <SaveIndicator isSaving={isSaving} />
        <button
          onClick={handleSave}
          disabled={isSaving || !percentageInput || isNaN(Number(percentageInput))}
          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-600"
        >
          <CheckIcon className="w-3 h-3" />
        </button>
        <button
          onClick={handleCancel}
          disabled={isSaving}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
        >
          <Cross2Icon className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => {
        setIsEditing(true);
        setPercentageInput(currentPercentage.toFixed(1));
      }}
      disabled={disabled || flourTotal === 0}
      className="font-mono text-sm hover:bg-blue-50 px-2 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-neutral-800"
      title="Click to edit percentage"
    >
      {formattedPercentage}
    </button>
  );
}
