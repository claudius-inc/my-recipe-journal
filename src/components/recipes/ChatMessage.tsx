import { type AIAssistantResponse } from "@/lib/gemini-assistant";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  changes?: AIAssistantResponse["changes"];
  onApplyChanges?: () => void;
  isApplying?: boolean;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  changes,
  onApplyChanges,
  isApplying = false,
}: ChatMessageProps) {
  const isUser = role === "user";
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-blue-600 text-white dark:bg-blue-500"
            : "bg-gradient-to-br from-purple-50 to-blue-50 text-neutral-900 dark:from-purple-900/30 dark:to-blue-900/30 dark:text-neutral-100"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      </div>

      {!isUser && changes && (onApplyChanges || isApplying) && (
        <div className="w-full max-w-[85%] rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/60 dark:bg-blue-900/20">
          <h4 className="mb-2 text-xs font-semibold text-blue-900 dark:text-blue-300">
            Suggested Changes
          </h4>

          {changes.ingredients && changes.ingredients.length > 0 && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-blue-800 dark:text-blue-400">
                Ingredients:
              </p>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                {changes.ingredients.map((change, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    {change.name && <span className="font-medium">{change.name}:</span>}
                    {change.quantity !== undefined && (
                      <span>
                        {change.quantity}
                        {change.unit || ""}
                      </span>
                    )}
                    {change.role && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">
                        ({change.role})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {changes.recipe && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-blue-800 dark:text-blue-400">
                Recipe:
              </p>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                {changes.recipe.name && (
                  <li className="flex items-center gap-2">
                    <span className="text-blue-400">•</span>
                    <span className="font-medium">Name:</span>
                    <span>{changes.recipe.name}</span>
                  </li>
                )}
                {changes.recipe.description && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span className="font-medium">Description:</span>
                    <span className="flex-1">{changes.recipe.description}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {changes.version && (
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-blue-800 dark:text-blue-400">
                Notes:
              </p>
              <ul className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                {changes.version.notes && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span className="flex-1">{changes.version.notes}</span>
                  </li>
                )}
                {changes.version.tastingNotes && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span className="flex-1">{changes.version.tastingNotes}</span>
                  </li>
                )}
              </ul>
            </div>
          )}

          {onApplyChanges && (
            <button
              type="button"
              onClick={onApplyChanges}
              disabled={isApplying}
              className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {isApplying ? "Applying Changes..." : "Apply Changes"}
            </button>
          )}
        </div>
      )}

      <span
        className={`text-[10px] text-neutral-400 dark:text-neutral-600 ${isUser ? "mr-2" : "ml-2"}`}
      >
        {time}
      </span>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-2">
      <div className="max-w-[85%] rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 px-4 py-3 dark:from-purple-900/30 dark:to-blue-900/30">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.3s] dark:bg-blue-300"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 [animation-delay:-0.15s] dark:bg-blue-300"></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-blue-400 dark:bg-blue-300"></div>
        </div>
      </div>
    </div>
  );
}
