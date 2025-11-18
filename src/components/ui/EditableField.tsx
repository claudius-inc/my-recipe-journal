import { TextArea } from "@radix-ui/themes";
import { SaveIndicator } from "./SaveIndicator";

export interface EditableFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  onBlur?: () => void;
  isSaving?: boolean;
}

export function EditableField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  rows = 3,
  onBlur,
  isSaving = false,
}: EditableFieldProps) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
        <SaveIndicator isSaving={isSaving} />
      </div>
      {multiline ? (
        <TextArea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
        />
      ) : (
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
        />
      )}
    </label>
  );
}
