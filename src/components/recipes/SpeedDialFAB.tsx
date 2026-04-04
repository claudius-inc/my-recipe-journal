"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Tooltip } from "@radix-ui/themes";
import { CopyIcon, ArchiveIcon, Cross2Icon, PlusIcon } from "@radix-ui/react-icons";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  ariaLabel: string;
}

interface SpeedDialFABProps {
  onDuplicate: () => void;
  onArchive: () => void;
  isArchived: boolean;
}

export function SpeedDialFAB({ onDuplicate, onArchive, isArchived }: SpeedDialFABProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isKeyboardVisible } = useKeyboardHeight();
  const fabRef = useRef<HTMLDivElement>(null);

  // Define actions
  const actions: SpeedDialAction[] = [
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
      color: isArchived ? "text-orange-600" : "",
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
                <span className="whitespace-nowrap rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg">
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
                    className="group flex h-12 w-12 items-center justify-center shadow-lg transition-all hover:scale-110 hover:shadow-xl active:scale-95"
                    style={{
                      backgroundColor: "#262626",
                      color: action.color === "text-orange-600" ? "#ea580c" : "#ffffff",
                      border: "1px solid #404040",
                    }}
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
            className="group flex h-14 w-14 items-center justify-center shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95"
            style={{
              backgroundColor: "#262626",
              color: "#ffffff",
              border: "1px solid #404040",
            }}
            aria-label={isOpen ? "Close quick actions menu" : "Open quick actions menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? (
              <Cross2Icon width={20} height={20} className="min-w-[13px]" />
            ) : (
              <PlusIcon width={20} height={20} className="min-w-[13px]" />
            )}
          </Button>
        </Tooltip>
      </div>
    </>
  );
}
