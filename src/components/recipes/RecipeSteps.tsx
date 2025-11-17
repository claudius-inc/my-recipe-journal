"use client";

import { useState } from "react";
import { Box, Flex, Text, Button, TextField, IconButton } from "@radix-ui/themes";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  Pencil1Icon,
  ClipboardIcon,
} from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { RecipeStep } from "@/types/recipes";
import { parseInstructionsToSteps } from "@/lib/recipe-steps-helpers";
import { useToast } from "@/context/ToastContext";

interface RecipeStepsProps {
  steps: RecipeStep[];
  onUpdate: (steps: RecipeStep[]) => void;
  isEditing: boolean;
  defaultCollapsed?: boolean;
}

export function RecipeSteps({
  steps = [],
  onUpdate,
  isEditing: _isEditing,
  defaultCollapsed = true,
}: RecipeStepsProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [isEditing, setIsEditing] = useState(_isEditing);
  const { addToast } = useToast();

  // Show if: editing, has steps, or is open (for adding first step)
  if (!isEditing && steps.length === 0 && !isOpen) {
    return (
      <Box className="border-b border-gray-200 py-4">
        <Button
          variant="soft"
          size="2"
          onClick={() => {
            setIsEditing(true);
            setIsOpen(true);
          }}
        >
          <PlusIcon /> Add Recipe Steps
        </Button>
      </Box>
    );
  }

  const handleStepChange = (order: number, newText: string) => {
    const updated = steps.map((step) =>
      step.order === order ? { ...step, text: newText } : step,
    );
    onUpdate(updated);
  };

  const handleAddStep = () => {
    const newOrder = steps.length + 1;
    onUpdate([...steps, { order: newOrder, text: "" }]);
  };

  const handleRemoveStep = (order: number) => {
    const filtered = steps.filter((s) => s.order !== order);
    // Reorder remaining steps
    const reordered = filtered.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));
    onUpdate(reordered);
  };

  const handlePasteSteps = async () => {
    try {
      // Read text from clipboard
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.trim().length === 0) {
        addToast("Clipboard is empty", "error");
        return;
      }

      // Parse the pasted text into steps
      const parsedSteps = parseInstructionsToSteps(clipboardText);

      if (parsedSteps.length === 0) {
        addToast("No valid steps found in clipboard", "error");
        return;
      }

      // Append to existing steps with updated order numbers
      const currentMaxOrder = steps.length;
      const newSteps = parsedSteps.map((step, idx) => ({
        order: currentMaxOrder + idx + 1,
        text: step.text,
      }));

      const updatedSteps = [...steps, ...newSteps];
      onUpdate(updatedSteps);

      addToast(
        `${parsedSteps.length} step${parsedSteps.length > 1 ? "s" : ""} added`,
        "success",
      );
    } catch (error) {
      // Handle clipboard permission errors or other failures
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          addToast("Clipboard access denied. Please grant permission.", "error");
        } else {
          addToast("Failed to paste steps. Please try again.", "error");
        }
      } else {
        addToast("Failed to paste steps. Please try again.", "error");
      }
      console.error("Paste error:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      // Allow default paste behavior in the input field itself
      // Don't trigger multi-step paste when there's selected text in the input
      const target = e.target as HTMLInputElement;
      if (target.selectionStart !== target.selectionEnd) {
        return; // Let native paste happen for selected text
      }

      // Only trigger multi-step paste if input is empty or at the start
      if (target.value.trim().length === 0 || target.selectionStart === 0) {
        e.preventDefault();
        handlePasteSteps();
      }
    }
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <section className="rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        {/* Header */}
        <Collapsible.Trigger asChild>
          <Flex
            justify="between"
            align="center"
            className="cursor-pointer hover:bg-gray-50 px-5 py-2 rounded-2xl"
          >
            <Flex align="center" gap="2">
              {isOpen ? (
                <ChevronDownIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Recipe Steps
              </h3>
            </Flex>

            <Flex align="center" gap="2" className="ml-auto">
              {/* Edit button */}
              {!isEditing && steps.length > 0 && (
                <IconButton
                  variant="ghost"
                  size="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditing(true);
                    setIsOpen(true);
                  }}
                >
                  <Pencil1Icon />
                </IconButton>
              )}

              {/* Step count badge */}
              {steps.length > 0 && (
                <Flex
                  align="center"
                  justify="center"
                  className="bg-[var(--accent-8)] text-white rounded-full w-6 h-6 text-xs font-medium"
                >
                  {steps.length}
                </Flex>
              )}
            </Flex>
          </Flex>
        </Collapsible.Trigger>

        {/* Content */}
        <Collapsible.Content>
          <Box className="space-y-3 p-4">
            {steps.length === 0 && isEditing ? (
              <Text size="2" color="gray">
                No steps yet. Click &quot;Add Step&quot; to begin.
              </Text>
            ) : (
              steps.map((step) => (
                <Flex key={step.order} gap="1" align="start">
                  {/* Step number */}
                  <Text size="2" weight="bold" className="min-w-[24px] text-gray-500">
                    {step.order}.
                  </Text>

                  {/* Step text */}
                  {isEditing ? (
                    <Flex gap="2" className="flex-1">
                      <TextField.Root
                        value={step.text}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          handleStepChange(step.order, e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Enter step instructions..."
                        className="flex-1"
                      />

                      <IconButton
                        variant="ghost"
                        color="red"
                        onClick={() => handleRemoveStep(step.order)}
                      >
                        <TrashIcon />
                      </IconButton>
                    </Flex>
                  ) : (
                    <Text size="2" className="flex-1">
                      {step.text}
                    </Text>
                  )}
                </Flex>
              ))
            )}

            {/* Add step and paste buttons (editing only) */}
            {isEditing && (
              <Flex gap="2" className="mt-3">
                <Button
                  variant="soft"
                  size="2"
                  onClick={handleAddStep}
                  className="flex-1"
                >
                  <PlusIcon /> Add Step
                </Button>
                <Button
                  variant="outline"
                  size="2"
                  onClick={handlePasteSteps}
                  title="Paste multiple steps at once (or press Ctrl+V / ⌘V in an empty step field)"
                >
                  <ClipboardIcon /> Paste Steps, or{" "}
                  <Text className="ml-1 text-xs text-white bg-[var(--accent-9)] rounded-sm py-0.5 px-1">
                    <kbd>Ctrl+V</kbd>
                  </Text>
                </Button>
                <Button variant="solid" size="2" onClick={() => setIsEditing(false)}>
                  Done
                </Button>
              </Flex>
            )}
          </Box>
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
