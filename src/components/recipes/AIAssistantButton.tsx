interface AIAssistantButtonProps {
  onClick: () => void;
  badge?: number;
}

export function AIAssistantButton({ onClick, badge }: AIAssistantButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 dark:from-purple-500 dark:to-blue-500"
      aria-label="Open AI Assistant"
    >
      <span className="text-lg">✨</span>
      <span className="hidden sm:inline">AI Assistant</span>
      <span className="sm:hidden">AI</span>
      {badge && badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}
