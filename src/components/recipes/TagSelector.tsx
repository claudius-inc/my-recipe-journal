"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button, TextField } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import {
  TASTE_TAG_CATEGORIES,
  TEXTURE_TAG_CATEGORIES,
  getAllTasteTags,
  getAllTextureTags,
} from "@/lib/tags";

interface TagSelectorProps {
  label: string;
  value: string[];
  onChange: (tags: string[]) => void;
  type: "taste" | "texture";
  disabled?: boolean;
}

export function TagSelector({
  label,
  value,
  onChange,
  type,
  disabled = false,
}: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [customTag, setCustomTag] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categories = type === "taste" ? TASTE_TAG_CATEGORIES : TEXTURE_TAG_CATEGORIES;
  const allTags = type === "taste" ? getAllTasteTags() : getAllTextureTags();

  // Filter tags based on search
  const filteredTags = allTags.filter((tag) =>
    tag.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // Check if we should show "add custom" option
  const hasCustomMatch =
    searchTerm.trim().length > 0 &&
    !allTags.some((tag) => tag.toLowerCase() === searchTerm.toLowerCase()) &&
    !value.some((tag) => tag.toLowerCase() === searchTerm.toLowerCase());

  const handleAddTag = (tag: string) => {
    if (!value.includes(tag)) {
      onChange([...value, tag]);
    }
    setSearchTerm("");
    setCustomTag("");
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleAddCustom = () => {
    if (searchTerm.trim() && !value.includes(searchTerm.trim())) {
      handleAddTag(searchTerm.trim());
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      <div className="relative" ref={dropdownRef}>
        <div
          className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg bg-white min-h-10 cursor-text"
          onClick={() => !disabled && inputRef.current?.focus()}
        >
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
            >
              {tag}
              <Button
                variant="ghost"
                size="1"
                className="!ml-1 !p-0 !h-auto !min-h-0"
                onClick={() => !disabled && handleRemoveTag(tag)}
                disabled={disabled}
              >
                <Cross2Icon className="w-3 h-3" />
              </Button>
            </span>
          ))}
          <TextField.Root
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={value.length === 0 ? `Add ${type} tag...` : ""}
            disabled={disabled}
            className="flex-1 min-w-32 outline-none bg-transparent placeholder-gray-400 text-sm"
          />
        </div>

        {isOpen && !disabled && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
            {searchTerm.trim().length === 0 ? (
              // Show categories when no search
              <div className="p-2">
                {Object.entries(categories).map(([key, category]) => (
                  <div key={key} className="mb-2">
                    <div className="text-xs font-semibold text-gray-500 px-2 py-1 uppercase">
                      {category.name}
                    </div>
                    <div className="space-y-1">
                      {category.tags.map((tag) => (
                        <Button
                          key={tag}
                          variant="ghost"
                          size="2"
                          className={`!w-full !justify-start ${
                            value.includes(tag)
                              ? "!bg-blue-50 !text-blue-700 !font-medium"
                              : ""
                          }`}
                          onClick={() => handleAddTag(tag)}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Show filtered results with "add custom" option
              <div className="p-2">
                {filteredTags.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {filteredTags.map((tag) => (
                      <Button
                        key={tag}
                        variant="ghost"
                        size="2"
                        className={`!w-full !justify-start ${
                          value.includes(tag)
                            ? "!bg-blue-50 !text-blue-700 !font-medium"
                            : ""
                        }`}
                        onClick={() => handleAddTag(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                )}

                {hasCustomMatch && (
                  <Button
                    variant="ghost"
                    size="2"
                    className="!w-full !justify-start border-t border-gray-200 mt-2 pt-2"
                    onClick={handleAddCustom}
                  >
                    + Add custom: <span className="font-medium">{searchTerm}</span>
                  </Button>
                )}

                {filteredTags.length === 0 && !hasCustomMatch && (
                  <div className="px-3 py-2 text-sm text-gray-500">No tags found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
