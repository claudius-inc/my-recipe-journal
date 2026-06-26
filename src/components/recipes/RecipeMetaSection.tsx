"use client";

import { useEffect, useState } from "react";
import { TextField, Select, Badge } from "@radix-ui/themes";
import { SaveIndicator } from "@/components/ui/SaveIndicator";
import { useUnitSystem } from "@/hooks/useUnitSystem";
import { celsiusToFahrenheit, fahrenheitToCelsius } from "@/lib/units";
import type { Recipe, RecipeVersion, RecipeDifficulty } from "@/types/recipes";

type VersionMetaPatch = Partial<{
  servings: number | null;
  prepTime: string | null;
  cookTime: string | null;
  totalTime: string | null;
  restTime: string | null;
  ovenTempC: number | null;
  difficulty: RecipeDifficulty | null;
}>;

interface RecipeMetaSectionProps {
  recipe: Recipe;
  version: RecipeVersion;
  onSave: (patch: VersionMetaPatch) => Promise<void>;
}

const DIFFICULTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "—" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];

function Field({
  label,
  children,
  saving,
}: {
  label: string;
  children: React.ReactNode;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          {label}
        </span>
        {saving && <SaveIndicator isSaving />}
      </div>
      {children}
    </div>
  );
}

export function RecipeMetaSection({ recipe, version, onSave }: RecipeMetaSectionProps) {
  const unitSystem = useUnitSystem();
  const ovenUnitLabel = unitSystem === "imperial" ? "°F" : "°C";

  const ovenToDisplay = (c: number | null | undefined): string => {
    if (c == null) return "";
    return String(unitSystem === "imperial" ? celsiusToFahrenheit(c) : Math.round(c));
  };

  const [servings, setServings] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [totalTime, setTotalTime] = useState("");
  const [restTime, setRestTime] = useState("");
  const [ovenTemp, setOvenTemp] = useState("");
  // Difficulty is held locally too. updateVersion isn't optimistic (it PATCHes
  // then invalidates → a delayed refetch), so binding the Select directly to the
  // prop made it snap back to the old value until the refetch landed.
  const [difficulty, setDifficulty] = useState<string>("none");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  // Reseed when the active version changes or the unit preference flips.
  useEffect(() => {
    setServings(version.servings != null ? String(version.servings) : "");
    setPrepTime(version.prepTime ?? "");
    setCookTime(version.cookTime ?? "");
    setTotalTime(version.totalTime ?? "");
    setRestTime(version.restTime ?? "");
    setOvenTemp(ovenToDisplay(version.ovenTempC));
    setDifficulty(version.difficulty ?? "none");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    version.id,
    version.servings,
    version.prepTime,
    version.cookTime,
    version.totalTime,
    version.restTime,
    version.ovenTempC,
    version.difficulty,
    unitSystem,
  ]);

  const save = async (key: string, patch: VersionMetaPatch) => {
    setSavingKey(key);
    try {
      await onSave(patch);
    } finally {
      setSavingKey(null);
    }
  };

  const saveServings = () => {
    const next = servings.trim() === "" ? null : parseInt(servings, 10);
    const normalized = next != null && Number.isNaN(next) ? null : next;
    if (normalized !== (version.servings ?? null))
      save("servings", { servings: normalized });
  };

  const saveText = (
    key: "prepTime" | "cookTime" | "totalTime" | "restTime",
    value: string,
  ) => {
    const next = value.trim() || null;
    if (next !== (version[key] ?? null)) save(key, { [key]: next });
  };

  const saveOvenTemp = () => {
    const raw = ovenTemp.trim();
    let next: number | null = null;
    if (raw !== "") {
      const n = parseFloat(raw);
      if (!Number.isNaN(n)) {
        next = unitSystem === "imperial" ? fahrenheitToCelsius(n) : n;
      }
    }
    if (next !== (version.ovenTempC ?? null)) save("ovenTempC", { ovenTempC: next });
  };

  const metadataEntries = version.metadata
    ? Object.entries(version.metadata).filter(([, v]) => v !== "" && v != null)
    : [];

  return (
    <section className="grid gap-4 rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">Details</h3>
        {(recipe.sourceUrl || recipe.sourceName) && (
          <span className="text-xs text-neutral-500">
            Imported from{" "}
            {recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {recipe.sourceName || new URL(recipe.sourceUrl).hostname}
              </a>
            ) : (
              recipe.sourceName
            )}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Field label="Servings" saving={savingKey === "servings"}>
          <TextField.Root
            type="number"
            inputMode="numeric"
            value={servings}
            placeholder="—"
            disabled={savingKey === "servings"}
            onChange={(e) => setServings(e.target.value)}
            onBlur={saveServings}
          />
        </Field>

        <Field label="Difficulty" saving={savingKey === "difficulty"}>
          <Select.Root
            value={difficulty}
            disabled={savingKey === "difficulty"}
            onValueChange={(v) => {
              // Optimistic: reflect the choice immediately, then persist.
              setDifficulty(v);
              save("difficulty", {
                difficulty: v === "none" ? null : (v as RecipeDifficulty),
              });
            }}
          >
            <Select.Trigger />
            <Select.Content>
              {DIFFICULTY_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Field>

        <Field label={`Oven (${ovenUnitLabel})`} saving={savingKey === "ovenTempC"}>
          <TextField.Root
            type="number"
            inputMode="numeric"
            value={ovenTemp}
            placeholder="—"
            disabled={savingKey === "ovenTempC"}
            onChange={(e) => setOvenTemp(e.target.value)}
            onBlur={saveOvenTemp}
          />
        </Field>

        <Field label="Prep time" saving={savingKey === "prepTime"}>
          <TextField.Root
            value={prepTime}
            placeholder="e.g. 20 min"
            disabled={savingKey === "prepTime"}
            onChange={(e) => setPrepTime(e.target.value)}
            onBlur={() => saveText("prepTime", prepTime)}
          />
        </Field>

        <Field label="Cook time" saving={savingKey === "cookTime"}>
          <TextField.Root
            value={cookTime}
            placeholder="e.g. 45 min"
            disabled={savingKey === "cookTime"}
            onChange={(e) => setCookTime(e.target.value)}
            onBlur={() => saveText("cookTime", cookTime)}
          />
        </Field>

        <Field label="Total time" saving={savingKey === "totalTime"}>
          <TextField.Root
            value={totalTime}
            placeholder="e.g. 1 hr 20 min"
            disabled={savingKey === "totalTime"}
            onChange={(e) => setTotalTime(e.target.value)}
            onBlur={() => saveText("totalTime", totalTime)}
          />
        </Field>

        <Field label="Rest / proof" saving={savingKey === "restTime"}>
          <TextField.Root
            value={restTime}
            placeholder="e.g. 8 hr"
            disabled={savingKey === "restTime"}
            onChange={(e) => setRestTime(e.target.value)}
            onBlur={() => saveText("restTime", restTime)}
          />
        </Field>
      </div>

      {metadataEntries.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            More
          </span>
          <div className="flex flex-wrap gap-2">
            {metadataEntries.map(([key, value]) => (
              <Badge key={key} variant="soft" color="gray">
                {key}: {String(value)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
