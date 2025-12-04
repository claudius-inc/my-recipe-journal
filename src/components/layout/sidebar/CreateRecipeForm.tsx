import { Button, TextField } from "@radix-ui/themes";
import { CategorySelector } from "@/components/recipes/selectors";
import type { RecipeCategory } from "@/types/recipes";

interface CreateRecipeFormProps {
  name: string;
  onNameChange: (name: string) => void;
  category: RecipeCategory;
  onCategoryChange: (category: RecipeCategory) => void;
  error: string | null;
  isSaving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function CreateRecipeForm({
  name,
  onNameChange,
  category,
  onCategoryChange,
  error,
  isSaving,
  onSave,
  onCancel,
}: CreateRecipeFormProps) {
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Recipe name</label>
        <TextField.Root
          autoFocus
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-neutral-500">Category</label>
        <CategorySelector value={category} onChange={onCategoryChange} />
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <Button size="2" className="flex-1" onClick={onSave} disabled={isSaving}>
          {isSaving ? "Creating…" : "Create"}
        </Button>
        <Button variant="outline" size="2" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
