import { Button, Tooltip } from "@radix-ui/themes";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";
import { MoonIcon } from "@radix-ui/react-icons";

interface AIAssistantButtonProps {
  onClick: () => void;
  badge?: number;
}

export function AIAssistantButton({ onClick, badge }: AIAssistantButtonProps) {
  const { isKeyboardVisible } = useKeyboardHeight();

  return (
    <Button
      type="button"
      onClick={onClick}
      variant="solid"
      size="3"
      radius="full"
      className={`group fixed z-40 flex items-center gap-2 bg-neutral-800 hover:bg-neutral-900 text-white border border-neutral-700 shadow-lg transition-all hover:scale-105 hover:shadow-xl active:scale-95 pb-[env(safe-area-inset-bottom)] ${
        isKeyboardVisible ? "top-4 right-4" : "bottom-6 right-6"
      }`}
      aria-label="Open Recipe Helper"
    >
      <Tooltip content="Open Recipe Helper">
        <span className="flex flex-row items-center gap-2">
          <MoonIcon className="w-4 h-4" />
          <span>Helper</span>
          {badge && badge > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
              {badge > 9 ? "9+" : badge}
            </span>
          )}
        </span>
      </Tooltip>
    </Button>
  );
}
