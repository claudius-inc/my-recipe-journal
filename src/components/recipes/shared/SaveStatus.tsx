"use client";

import type { ReactNode } from "react";
import { Flex, Text } from "@radix-ui/themes";
import { CheckIcon, ClockIcon, ReloadIcon } from "@radix-ui/react-icons";

interface SaveStatusProps {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  error: Error | null;
  onRetry?: () => void;
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function SaveStatus({
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  error,
  onRetry,
}: SaveStatusProps) {
  let content: ReactNode = null;

  if (error) {
    content = (
      <Flex align="center" gap="1" className="text-xs text-red-600">
        <ReloadIcon className="w-3 h-3" />
        <Text size="1">Save failed</Text>
        {onRetry && (
          <button onClick={onRetry} className="underline hover:no-underline ml-1">
            Retry
          </button>
        )}
      </Flex>
    );
  } else if (isSaving) {
    content = (
      <Flex align="center" gap="1" className="text-xs text-gray-500">
        <ReloadIcon className="w-3 h-3 animate-spin" />
        <Text size="1">Saving...</Text>
      </Flex>
    );
  } else if (hasUnsavedChanges) {
    content = (
      <Flex align="center" gap="1" className="text-xs text-amber-600">
        <ClockIcon className="w-3 h-3" />
        <Text size="1">Unsaved</Text>
      </Flex>
    );
  } else if (lastSaved) {
    content = (
      <Flex align="center" gap="1" className="text-xs text-green-600">
        <CheckIcon className="w-3 h-3" />
        <Text size="1">Saved {formatRelativeTime(lastSaved)}</Text>
      </Flex>
    );
  }

  if (!content) return null;

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {content}
    </div>
  );
}
