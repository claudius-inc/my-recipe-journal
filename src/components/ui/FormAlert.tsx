import type { ReactNode } from "react";
import { CheckCircledIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { cn } from "@/lib/utils";

interface FormAlertProps {
  type: "error" | "success";
  children: ReactNode;
  className?: string;
}

/** Consistent inline error/success banner with an icon and a live region. */
export function FormAlert({ type, children, className }: FormAlertProps) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-green-200 bg-green-50 text-green-700",
        className,
      )}
    >
      {type === "error" ? (
        <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      ) : (
        <CheckCircledIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      )}
      <span>{children}</span>
    </div>
  );
}
