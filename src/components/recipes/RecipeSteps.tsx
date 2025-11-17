"use client";

import { useState } from "react";
import { Box, Flex, Text, Button, TextField, IconButton } from "@radix-ui/themes";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PlusIcon,
  TrashIcon,
  Pencil1Icon,
} from "@radix-ui/react-icons";
import * as Collapsible from "@radix-ui/react-collapsible";
import type { RecipeStep } from "@/types/recipes";

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

  return (
    <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
      <Box className="border-b border-gray-200 py-4">
        {/* Header */}
        <Collapsible.Trigger asChild>
          <Flex
            justify="between"
            align="center"
            className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
          >
            <Flex align="center" gap="2">
              {isOpen ? (
                <ChevronDownIcon width="20" height="20" />
              ) : (
                <ChevronRightIcon width="20" height="20" />
              )}
              <Text size="4" weight="bold">
                Recipe Steps
              </Text>
            </Flex>

            <Flex align="center" gap="2">
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
                  className="bg-blue-500 text-white rounded-full w-8 h-8 text-sm font-medium"
                >
                  {steps.length}
                </Flex>
              )}
            </Flex>
          </Flex>
        </Collapsible.Trigger>

        {/* Content */}
        <Collapsible.Content>
          <Box className="mt-4 space-y-3">
            {steps.length === 0 && isEditing ? (
              <Text size="2" color="gray">
                No steps yet. Click &quot;Add Step&quot; to begin.
              </Text>
            ) : (
              steps.map((step) => (
                <Flex key={step.order} gap="3" align="start">
                  {/* Step number */}
                  <Text
                    size="2"
                    weight="bold"
                    className="mt-2 min-w-[24px] text-gray-500"
                  >
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

            {/* Add step button (editing only) */}
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
                <Button variant="solid" size="2" onClick={() => setIsEditing(false)}>
                  Done
                </Button>
              </Flex>
            )}
          </Box>
        </Collapsible.Content>
      </Box>
    </Collapsible.Root>
  );
}
