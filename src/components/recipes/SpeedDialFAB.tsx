"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Tooltip } from "@radix-ui/themes";
import { MoonIcon, CopyIcon, ArchiveIcon, Cross2Icon } from "@radix-ui/react-icons";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  ariaLabel: string;
}

interface SpeedDialFABProps {
  onOpenAI: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  isArchived: boolean;
}

export function SpeedDialFAB({
  onOpenAI,
  onDuplicate,
  onArchive,
  isArchived,
}: SpeedDialFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isKeyboardVisible } = useKeyboardHeight();
  const fabRef = useRef<HTMLDivElement>(null);

  // Define actions
  const actions: SpeedDialAction[] = [
    {
      icon: <MoonIcon className="h-4 w-4" />,
      label: "Recipe Helper",
      onClick: () => {
        onOpenAI();
        setIsOpen(false);
      },
      ariaLabel: "Open Recipe Helper",
    },
    {
      icon: <CopyIcon className="h-4 w-4" />,
      label: "Duplicate Recipe",
      onClick: () => {
        onDuplicate();
        setIsOpen(false);
      },
      ariaLabel: "Duplicate recipe",
    },
    {
      icon: <ArchiveIcon className="h-4 w-4" />,
      label: isArchived ? "Unarchive Recipe" : "Archive Recipe",
      onClick: () => {
        onArchive();
        setIsOpen(false);
      },
      color: isArchived ? "text-orange-600 dark:text-orange-400" : "",
      ariaLabel: isArchived ? "Unarchive recipe" : "Archive recipe",
    },
  ];

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-neutral-950/20 backdrop-blur-[2px] transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Speed Dial Container */}
      <div
        ref={fabRef}
        className={`fixed z-50 flex flex-col-reverse items-end gap-3 transition-all duration-300 ${
          isKeyboardVisible ? "top-4 right-4" : "bottom-6 right-6"
        }`}
      >
        {/* Action Buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse items-end gap-3 pb-2">
            {actions.map((action, index) => (
              <div
                key={index}
                className="flex items-center gap-3 animate-fadeIn"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "backwards",
                }}
              >
                {/* Label */}
                <span className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-neutral-100 dark:text-neutral-900">
                  {action.label}
                </span>

                {/* Mini FAB */}
                <Tooltip content={action.label}>
                  <Button
                    type="button"
                    onClick={action.onClick}
                    variant="solid"
                    size="3"
                    radius="full"
                    className={`group flex h-12 w-12 items-center justify-center border border-neutral-700 bg-neutral-800 text-white shadow-lg transition-all hover:scale-110 hover:bg-neutral-900 hover:shadow-xl active:scale-95 dark:border-neutral-300 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-100 ${
                      action.color || ""
                    }`}
                    aria-label={action.ariaLabel}
                  >
                    {action.icon}
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        )}

        {/* Main FAB */}
        <Tooltip content={isOpen ? "Close menu" : "Quick actions"}>
          <Button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            variant="solid"
            size="4"
            radius="full"
            className={`group flex h-14 w-14 items-center justify-center border border-neutral-700 bg-neutral-800 text-white shadow-lg transition-all hover:scale-105 hover:bg-neutral-900 hover:shadow-xl active:scale-95 dark:border-neutral-300 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-neutral-100 ${
              isOpen ? "rotate-45" : "rotate-0"
            }`}
            aria-label={isOpen ? "Close quick actions menu" : "Open quick actions menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <Cross2Icon className="h-5 w-5" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
            )}
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
