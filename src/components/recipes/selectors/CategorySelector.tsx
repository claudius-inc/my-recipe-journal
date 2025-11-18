"use client";

import { DropdownMenu, Button } from "@radix-ui/themes";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import {
  RecipeCategory,
  CATEGORY_HIERARCHY,
  PRIMARY_LABELS,
  SECONDARY_LABELS,
  type PrimaryCategoryKey,
  type SecondaryCategoryKey,
} from "@/types/recipes";

interface CategorySelectorProps {
  value: RecipeCategory;
  onChange: (category: RecipeCategory) => void;
  placeholder?: string;
}

export function CategorySelector({
  value,
  onChange,
  placeholder,
}: CategorySelectorProps) {
  const displayLabel = value
    ? `${PRIMARY_LABELS[value.primary]} → ${SECONDARY_LABELS[value.secondary]}`
    : placeholder || "Select category";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Button variant="surface" className="min-w-[200px] justify-between">
          <span className="truncate">{displayLabel}</span>
          <ChevronDownIcon />
        </Button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content>
        {/* Baking */}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>Baking</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            {CATEGORY_HIERARCHY.baking.map((secondary) => (
              <DropdownMenu.Item
                key={secondary}
                onSelect={() => onChange({ primary: "baking", secondary })}
              >
                {SECONDARY_LABELS[secondary]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        {/* Cooking */}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>Cooking</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            {CATEGORY_HIERARCHY.cooking.map((secondary) => (
              <DropdownMenu.Item
                key={secondary}
                onSelect={() => onChange({ primary: "cooking", secondary })}
              >
                {SECONDARY_LABELS[secondary]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        {/* Beverages */}
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger>Beverages</DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent>
            {CATEGORY_HIERARCHY.beverages.map((secondary) => (
              <DropdownMenu.Item
                key={secondary}
                onSelect={() => onChange({ primary: "beverages", secondary })}
              >
                {SECONDARY_LABELS[secondary]}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>

        <DropdownMenu.Separator />

        {/* Other */}
        <DropdownMenu.Item
          onSelect={() => onChange({ primary: "other", secondary: "other" })}
        >
          Miscellaneous
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
