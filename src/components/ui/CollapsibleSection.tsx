"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: "complete" | "partial" | "empty";
  className?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const getBadgeIcon = () => {
    switch (badge) {
      case "complete":
        return "✓";
      case "partial":
        return "○";
      case "empty":
        return "";
      default:
        return null;
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-sm transition-transform",
              isOpen ? "rotate-90" : "rotate-0",
            )}
          >
            ▶
          </span>
          <div>
            <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
            )}
          </div>
        </div>
        {badge && (
          <span
            className={cn(
              "rounded-full px-2 py-1 text-xs font-medium",
              badge === "complete" &&
                "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
              badge === "partial" &&
                "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
              badge === "empty" &&
                "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
            )}
          >
            {getBadgeIcon()}
          </span>
        )}
      </button>
      {isOpen && (
        <div className="border-t border-neutral-200 p-4 dark:border-neutral-700">
          {children}
        </div>
      )}
    </section>
  );
}
