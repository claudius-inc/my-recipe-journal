"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  TextField,
  TextArea,
  Select,
  IconButton,
  SegmentedControl,
  Text,
  Badge,
} from "@radix-ui/themes";
import { PlusIcon, TrashIcon, Cross2Icon } from "@radix-ui/react-icons";
import type { IngredientRole, RecipeCategory, UnitSystem } from "@/types/recipes";
import { INGREDIENT_ROLES } from "@/types/recipes";
import { IngredientRoleLabels } from "@/lib/ingredient-helpers";
import { convertIngredient, convertTemperatureInText, formatOvenTemp } from "@/lib/units";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { CategorySelector } from "../selectors";
import type { CreateRecipeWithDataPayload } from "@/store/RecipeStore";

interface PreviewIngredient {
  name: string;
  quantity: number | null;
  unit: string;
  role: IngredientRole;
  notes?: string;
}

export interface ExtractedForPreview {
  name: string;
  category: RecipeCategory;
  description?: string;
  ingredients?: PreviewIngredient[];
  ingredientGroups?: Array<{ name: string; ingredients: PreviewIngredient[] }>;
  steps?: Array<{ order: number; text: string }>;
  servings?: number | null;
  prepTime?: string | null;
  cookTime?: string | null;
  totalTime?: string | null;
  restTime?: string | null;
  ovenTempC?: number | null;
  difficulty?: "easy" | "medium" | "hard" | null;
  metadata?: Record<string, string | number> | null;
  imageUrl?: string;
  sourceUrl?: string;
}

interface EditableIngredient extends PreviewIngredient {
  key: string;
}
interface EditableGroup {
  key: string;
  name: string;
  ingredients: EditableIngredient[];
}

interface ImportPreviewEditorProps {
  extracted: ExtractedForPreview;
  saving: boolean;
  error?: string | null;
  onBack: () => void;
  onSave: (payload: CreateRecipeWithDataPayload) => Promise<void>;
}

let keyCounter = 0;
const nextKey = () => `imp-${keyCounter++}`;

function toEditableGroups(extracted: ExtractedForPreview): EditableGroup[] {
  const groups =
    extracted.ingredientGroups && extracted.ingredientGroups.length > 0
      ? extracted.ingredientGroups
      : [{ name: "Ingredients", ingredients: extracted.ingredients ?? [] }];
  return groups.map((g) => ({
    key: nextKey(),
    name: g.name,
    ingredients: g.ingredients.map((i) => ({ ...i, key: nextKey() })),
  }));
}

export function ImportPreviewEditor({
  extracted,
  saving,
  error,
  onBack,
  onSave,
}: ImportPreviewEditorProps) {
  const preferredSystem = useUnitSystem();

  const [name, setName] = useState(extracted.name);
  const [category, setCategory] = useState<RecipeCategory>(extracted.category);
  const [description, setDescription] = useState(extracted.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | undefined>(extracted.imageUrl);
  const [system, setSystem] = useState<UnitSystem>(preferredSystem);

  // Immutable snapshot of the originally extracted ingredients/steps, used as
  // the base for unit-system conversions.
  const baseGroups = useMemo(() => toEditableGroups(extracted), [extracted]);
  const baseSteps = useMemo(
    () => (extracted.steps ?? []).map((s) => s.text),
    [extracted],
  );

  const convertGroups = useMemo(
    () =>
      (sys: UnitSystem): EditableGroup[] =>
        baseGroups.map((g) => ({
          key: g.key,
          name: g.name,
          ingredients: g.ingredients.map((ing) => {
            const c = convertIngredient(ing, sys);
            return { ...ing, quantity: c.quantity, unit: c.unit, key: ing.key };
          }),
        })),
    [baseGroups],
  );

  const [groups, setGroups] = useState<EditableGroup[]>(() =>
    convertGroups(preferredSystem),
  );
  const [steps, setSteps] = useState<string[]>(() =>
    baseSteps.map((t) => convertTemperatureInText(t, preferredSystem)),
  );

  // Re-seed when a different extraction is loaded.
  useEffect(() => {
    setName(extracted.name);
    setCategory(extracted.category);
    setDescription(extracted.description ?? "");
    setImageUrl(extracted.imageUrl);
    setSystem(preferredSystem);
    setGroups(convertGroups(preferredSystem));
    setSteps(baseSteps.map((t) => convertTemperatureInText(t, preferredSystem)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extracted]);

  // Switching system re-derives ingredients/steps from the original snapshot
  // (discards manual ingredient edits — surfaced via the helper note).
  const handleSystemChange = (value: string) => {
    const sys = value as UnitSystem;
    setSystem(sys);
    setGroups(convertGroups(sys));
    setSteps(baseSteps.map((t) => convertTemperatureInText(t, sys)));
  };

  const updateIngredient = (
    gi: number,
    ii: number,
    patch: Partial<EditableIngredient>,
  ) => {
    setGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx !== gi
          ? g
          : {
              ...g,
              ingredients: g.ingredients.map((ing, iIdx) =>
                iIdx !== ii ? ing : { ...ing, ...patch },
              ),
            },
      ),
    );
  };

  const removeIngredient = (gi: number, ii: number) => {
    setGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx !== gi
          ? g
          : { ...g, ingredients: g.ingredients.filter((_, iIdx) => iIdx !== ii) },
      ),
    );
  };

  const addIngredient = (gi: number) => {
    setGroups((prev) =>
      prev.map((g, gIdx) =>
        gIdx !== gi
          ? g
          : {
              ...g,
              ingredients: [
                ...g.ingredients,
                { key: nextKey(), name: "", quantity: null, unit: "g", role: "other" },
              ],
            },
      ),
    );
  };

  const updateGroupName = (gi: number, value: string) => {
    setGroups((prev) => prev.map((g, gIdx) => (gIdx !== gi ? g : { ...g, name: value })));
  };

  const updateStep = (idx: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  const removeStep = (idx: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  const addStep = () => setSteps((prev) => [...prev, ""]);

  const handleSave = () => {
    const cleanedGroups = groups
      .map((g) => ({
        name: g.name.trim() || "Ingredients",
        ingredients: g.ingredients
          .filter((i) => i.name.trim())
          .map((i) => ({
            name: i.name.trim(),
            quantity: i.quantity,
            unit: i.unit.trim() || "g",
            role: i.role,
            notes: i.notes,
          })),
      }))
      .filter((g) => g.ingredients.length > 0);

    const cleanedSteps = steps
      .map((text, i) => ({ order: i + 1, text: text.trim() }))
      .filter((s) => s.text);

    const payload: CreateRecipeWithDataPayload = {
      name: name.trim(),
      category,
      description: description.trim() || undefined,
      ingredientGroups: cleanedGroups,
      steps: cleanedSteps.length > 0 ? cleanedSteps : undefined,
      imageUrl,
      sourceUrl: extracted.sourceUrl,
      servings: extracted.servings ?? null,
      prepTime: extracted.prepTime ?? null,
      cookTime: extracted.cookTime ?? null,
      totalTime: extracted.totalTime ?? null,
      restTime: extracted.restTime ?? null,
      ovenTempC: extracted.ovenTempC ?? null,
      difficulty: extracted.difficulty ?? null,
      metadata: extracted.metadata ?? null,
    };

    return onSave(payload);
  };

  const summaryChips: Array<{ label: string; value: string }> = [];
  if (extracted.servings)
    summaryChips.push({ label: "Serves", value: String(extracted.servings) });
  if (extracted.prepTime) summaryChips.push({ label: "Prep", value: extracted.prepTime });
  if (extracted.cookTime) summaryChips.push({ label: "Cook", value: extracted.cookTime });
  if (extracted.totalTime)
    summaryChips.push({ label: "Total", value: extracted.totalTime });
  if (extracted.restTime) summaryChips.push({ label: "Rest", value: extracted.restTime });
  if (extracted.ovenTempC != null)
    summaryChips.push({
      label: "Oven",
      value: formatOvenTemp(extracted.ovenTempC, system),
    });
  if (extracted.difficulty)
    summaryChips.push({ label: "Difficulty", value: extracted.difficulty });

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Recipe preview"
            className="h-44 w-full rounded-lg border border-neutral-200 object-cover"
          />
          <button
            type="button"
            onClick={() => setImageUrl(undefined)}
            className="absolute right-2 top-2 rounded-full bg-red-500 p-1.5 text-white hover:bg-red-600"
            title="Remove image"
          >
            <Cross2Icon />
          </button>
        </div>
      )}

      <div>
        <label className="text-sm font-medium text-neutral-700">Recipe Name</label>
        <TextField.Root
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Category</label>
        <div className="mt-1">
          <CategorySelector value={category} onChange={setCategory} />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Description</label>
        <TextField.Root
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1"
          placeholder="Optional description"
        />
      </div>

      {summaryChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summaryChips.map((c) => (
            <Badge key={c.label} variant="soft" color="gray">
              {c.label}: {c.value}
            </Badge>
          ))}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700">Units</label>
          <SegmentedControl.Root
            size="1"
            value={system}
            onValueChange={handleSystemChange}
          >
            <SegmentedControl.Item value="original">Original</SegmentedControl.Item>
            <SegmentedControl.Item value="metric">Metric</SegmentedControl.Item>
            <SegmentedControl.Item value="imperial">Imperial</SegmentedControl.Item>
          </SegmentedControl.Root>
        </div>
        <Text size="1" color="gray">
          Switching units re-converts from the original; do it before editing amounts.
        </Text>
      </div>

      <div className="space-y-4">
        {groups.map((group, gi) => (
          <div key={group.key} className="rounded-lg border border-neutral-200 p-3">
            <TextField.Root
              value={group.name}
              onChange={(e) => updateGroupName(gi, e.target.value)}
              className="mb-2 font-medium"
              placeholder="Group name"
            />
            <div className="space-y-2">
              {group.ingredients.map((ing, ii) => (
                <div key={ing.key} className="flex items-center gap-1.5">
                  <TextField.Root
                    className="w-14"
                    type="number"
                    value={ing.quantity ?? ""}
                    placeholder="Qty"
                    onChange={(e) =>
                      updateIngredient(gi, ii, {
                        quantity:
                          e.target.value === "" ? null : parseFloat(e.target.value),
                      })
                    }
                  />
                  <TextField.Root
                    className="w-16"
                    value={ing.unit}
                    placeholder="unit"
                    onChange={(e) => updateIngredient(gi, ii, { unit: e.target.value })}
                  />
                  <TextField.Root
                    className="flex-1"
                    value={ing.name}
                    placeholder="Ingredient"
                    onChange={(e) => updateIngredient(gi, ii, { name: e.target.value })}
                  />
                  <Select.Root
                    value={ing.role}
                    onValueChange={(v) =>
                      updateIngredient(gi, ii, { role: v as IngredientRole })
                    }
                  >
                    <Select.Trigger className="w-24" />
                    <Select.Content>
                      {INGREDIENT_ROLES.map((r) => (
                        <Select.Item key={r} value={r}>
                          {IngredientRoleLabels[r]}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                  <IconButton
                    type="button"
                    variant="ghost"
                    color="red"
                    onClick={() => removeIngredient(gi, ii)}
                    aria-label="Remove ingredient"
                  >
                    <TrashIcon />
                  </IconButton>
                </div>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="1"
              className="mt-2"
              onClick={() => addIngredient(gi)}
            >
              <PlusIcon /> Add ingredient
            </Button>
          </div>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium text-neutral-700">Steps</label>
        <div className="mt-1 space-y-2">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="mt-2 w-5 text-right text-sm font-semibold text-neutral-500">
                {idx + 1}.
              </span>
              <TextArea
                className="flex-1"
                value={step}
                onChange={(e) => updateStep(idx, e.target.value)}
                rows={2}
              />
              <IconButton
                type="button"
                variant="ghost"
                color="red"
                onClick={() => removeStep(idx)}
                aria-label="Remove step"
              >
                <TrashIcon />
              </IconButton>
            </div>
          ))}
        </div>
        <Button type="button" variant="ghost" size="1" className="mt-2" onClick={addStep}>
          <PlusIcon /> Add step
        </Button>
      </div>

      {extracted.sourceUrl && (
        <div className="text-xs text-neutral-500">
          Source:{" "}
          <a
            href={extracted.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {extracted.sourceUrl}
          </a>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="soft" onClick={onBack} disabled={saving}>
          Back
        </Button>
        <Button onClick={handleSave} disabled={saving || !name.trim()}>
          {saving ? "Saving..." : "Save Recipe"}
        </Button>
      </div>
    </div>
  );
}
