import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Spinner } from "@radix-ui/themes";
import { cn } from "@/lib/utils";

interface IngredientAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  onSelect?: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function IngredientAutocomplete({
  value,
  onChange,
  suggestions,
  isLoading = false,
  placeholder = "Ingredient name",
  disabled = false,
  onSelect,
  inputRef,
}: IngredientAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const activeInputRef = inputRef || internalInputRef;

  // Filter suggestions based on current value
  const filteredSuggestions = value.trim()
    ? suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase()),
      )
    : suggestions;

  // Show dropdown when focused and has suggestions
  const showDropdown = isOpen && filteredSuggestions.length > 0 && !disabled;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filteredSuggestions.length]);

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    onSelect?.(suggestion);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === "ArrowDown" && filteredSuggestions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        if (highlightedIndex >= 0) {
          e.preventDefault();
          handleSelect(filteredSuggestions[highlightedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    if (!isOpen && newValue.trim()) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={dropdownRef} className="relative flex-1">
      <input
        ref={activeInputRef}
        type="text"
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => {
          if (filteredSuggestions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls="ingredient-suggestions"
        aria-activedescendant={
          highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined
        }
      />

      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Spinner size="1" />
        </div>
      )}

      {showDropdown && (
        <div
          id="ingredient-suggestions"
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              id={`suggestion-${index}`}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors",
                index === highlightedIndex
                  ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-50"
                  : "text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
