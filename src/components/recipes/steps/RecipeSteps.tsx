"use client";

import { useState, useRef, useEffect } from "react";
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
import { SaveStatus } from "../shared/SaveStatus";

interface RecipeStepsProps {
  steps: RecipeStep[];
  onUpdate: (steps: RecipeStep[], actionType?: "delete" | "add" | "edit") => void;
  isEditing: boolean;
  defaultCollapsed?: boolean;
  isSaving?: boolean;
  lastSaved?: Date | null;
  saveError?: Error | null;
  onRetry?: () => void;
}

export function RecipeSteps({
  steps = [],
  onUpdate,
  isEditing: _isEditing,
  defaultCollapsed = true,
  isSaving = false,
  lastSaved = null,
  saveError = null,
  onRetry,
}: RecipeStepsProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);
  const [isEditing, setIsEditing] = useState(_isEditing);
  const { addToast } = useToast();
  const firstInputRef = useRef<HTMLTextAreaElement>(null);
  const wasEmptyOnExpandRef = useRef(false);

  // Device and accessibility detection
  const isMobile =
    typeof window !== "undefined" &&
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Auto-enable edit mode when expanding with 0 steps
  // Auto-create first step and auto-exit edit mode when collapsing
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && steps.length === 0) {
      setIsEditing(true);
      wasEmptyOnExpandRef.current = true;
      // Auto-create first empty step
      handleAddStep();
    } else if (!open) {
      // Cleanup: remove auto-created step if still empty
      if (wasEmptyOnExpandRef.current && steps.length === 1 && !steps[0].text.trim()) {
        onUpdate([], "delete");
      }
      wasEmptyOnExpandRef.current = false;
      setIsEditing(false);
    }
  };

  const handleStepChange = (order: number, newText: string) => {
    const updated = steps.map((step) =>
      step.order === order ? { ...step, text: newText } : step,
    );
    onUpdate(updated, "edit");
  };

  const handleAddStep = () => {
    const newOrder = steps.length + 1;
    onUpdate([...steps, { order: newOrder, text: "" }], "add");
  };

  const handleRemoveStep = (order: number) => {
    const filtered = steps.filter((s) => s.order !== order);
    // Reorder remaining steps
    const reordered = filtered.map((step, idx) => ({
      ...step,
      order: idx + 1,
    }));
    onUpdate(reordered, "delete");
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
      onUpdate(updatedSteps, "add");
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

  // Auto-focus first step when auto-created (desktop only)
  useEffect(() => {
    if (wasEmptyOnExpandRef.current && steps.length === 1 && isOpen && isEditing) {
      // Only auto-focus on desktop (avoid unwanted keyboard on mobile)
      if (!isMobile && !prefersReducedMotion) {
        // Delay to allow expand animation to complete
        const timer = setTimeout(() => {
          firstInputRef.current?.focus();
        }, 200);
        return () => clearTimeout(timer);
      }
    }
  }, [steps.length, isOpen, isEditing, isMobile, prefersReducedMotion]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Escape key: clear empty step and exit edit mode
    if (e.key === "Escape") {
      const target = e.target as HTMLTextAreaElement;
      if (!target.value.trim() && steps.length === 1) {
        onUpdate([], "delete");
        setIsEditing(false);
        setIsOpen(false);
        return;
      }
    }

    // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      // Allow default paste behavior in the textarea itself
      // Don't trigger multi-step paste when there's selected text in the textarea
      const target = e.target as HTMLTextAreaElement;
      if (target.selectionStart !== target.selectionEnd) {
        return; // Let native paste happen for selected text
      }

      // Only trigger multi-step paste if textarea is empty or at the start
      if (target.value.trim().length === 0 || target.selectionStart === 0) {
        e.preventDefault();
        handlePasteSteps();
      }
    }
  };

  return (
    <Collapsible.Root open={isOpen} onOpenChange={handleOpenChange}>
      <section className="rounded-2xl border border-neutral-200 bg-white">
        {/* ARIA announcement for screen readers */}
        {isEditing && wasEmptyOnExpandRef.current && steps.length === 1 && (
          <div role="status" aria-live="polite" className="sr-only">
            Edit mode enabled. Step 1 input field ready.
          </div>
        )}

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
              <h3 className="text-sm font-semibold text-neutral-800">Recipe Steps</h3>
            </Flex>

            <Flex align="center" gap="4" className="ml-auto">
              {/* Save status indicator */}
              {isEditing && (
                <SaveStatus
                  isSaving={isSaving}
                  hasUnsavedChanges={false}
                  lastSaved={lastSaved}
                  error={saveError}
                  onRetry={onRetry}
                />
              )}

              {/* Paste button (editing only) */}
              {isEditing && (
                <Button
                  variant="ghost"
                  size="1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePasteSteps();
                  }}
                  title="Paste multiple steps from clipboard (or press Ctrl+V / ⌘V in an empty step field)"
                >
                  <ClipboardIcon />
                  <span className="hidden sm:inline">Paste</span>
                </Button>
              )}

              {/* Edit/Done button - toggles edit mode */}
              <Button
                variant="ghost"
                size="1"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditing) {
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                    setIsOpen(true);
                  }
                }}
                title={isEditing ? "Exit edit mode" : "Edit steps"}
              >
                <Pencil1Icon />
                <span className="hidden sm:inline">Edit</span>
              </Button>

              {/* Step count badge */}
              <Flex
                align="center"
                justify="center"
                className="bg-[var(--accent-8)] text-white rounded-lg w-6 h-6 text-xs font-medium"
              >
                {steps.length}
              </Flex>
            </Flex>
          </Flex>
        </Collapsible.Trigger>

        {/* Content */}
        <Collapsible.Content>
          <Box className="space-y-3 p-4">
            {steps.length === 0 ? (
              <Text size="2" color="gray">
                {isEditing
                  ? 'No steps yet. Click "Add Step" to begin.'
                  : "No steps yet. Click the edit button to add steps."}
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
                    <Flex gap="2" className="flex-1 items-center">
                      <textarea
                        ref={step.order === 1 ? firstInputRef : null}
                        value={step.text}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          handleStepChange(step.order, e.target.value)
                        }
                        onKeyDown={handleKeyDown}
                        placeholder="Enter step instructions..."
                        aria-label={`Step ${step.order}`}
                        rows={1}
                        className="flex-1 min-h-[32px] p-2 rounded border border-gray-300 bg-white text-sm resize-none overflow-hidden field-sizing-content"
                        style={{
                          height: "auto",
                        }}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = "auto";
                          target.style.height = target.scrollHeight + "px";
                        }}
                      />

                      <IconButton
                        variant="ghost"
                        color="red"
                        size="2"
                        onClick={() => handleRemoveStep(step.order)}
                      >
                        <TrashIcon className="w-4 h-4" />
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

            {/* Add step button (editing only) */}
            {isEditing && (
              <Flex gap="2" className="mt-3 justify-end">
                <Button variant="soft" size="2" onClick={handleAddStep}>
                  <PlusIcon /> Add Step
                </Button>
              </Flex>
            )}
          </Box>
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
