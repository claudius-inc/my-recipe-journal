"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMessage, TypingIndicator } from "./ChatMessage";
import {
  QUICK_PROMPTS,
  type AIAssistantResponse,
  type ChatMessage as ChatMessageType,
} from "@/lib/gemini-assistant";
import type { Recipe, RecipeVersion, Ingredient } from "@/types/recipes";
import { useToast } from "@/context/ToastContext";

interface RecipeAIAssistantProps {
  recipe: Recipe;
  version: RecipeVersion;
  bakerPercentages?: {
    flourTotal: number;
    hydration: number;
    totalWeight: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (changes: AIAssistantResponse["changes"]) => Promise<void>;
}

type PanelState = "minimized" | "partial" | "expanded";

export function RecipeAIAssistant({
  recipe,
  version,
  bakerPercentages,
  isOpen,
  onClose,
  onApplyChanges,
}: RecipeAIAssistantProps) {
  const { addToast } = useToast();
  const [panelState, setPanelState] = useState<PanelState>("partial");
  const [messages, setMessages] = useState<
    (ChatMessageType & { changes?: AIAssistantResponse["changes"] })[]
  >([]);
  const [inputValue, setInputValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyingMessageIndex, setApplyingMessageIndex] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number>(0);
  const dragStartHeight = useRef<number>(0);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && panelState !== "minimized") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, panelState]);

  // Clear messages when version changes
  useEffect(() => {
    setMessages([]);
  }, [version.id]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!message.trim() || isGenerating) {
        return;
      }

      const userMessage: ChatMessageType = {
        role: "user",
        content: message.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsGenerating(true);

      try {
        const response = await fetch("/api/recipes/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipe,
            version,
            bakerPercentages,
            conversationHistory: messages,
            userMessage: message.trim(),
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Failed to get AI response");
        }

        const aiResponse = (await response.json()) as AIAssistantResponse;

        const assistantMessage: ChatMessageType & {
          changes?: AIAssistantResponse["changes"];
        } = {
          role: "assistant",
          content: aiResponse.message,
          timestamp: Date.now(),
          changes: aiResponse.changes,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error("AI assistant error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get AI response";
        addToast(errorMessage, "error");

        // Add error message to chat
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsGenerating(false);
      }
    },
    [isGenerating, messages, recipe, version, bakerPercentages, addToast],
  );

  const handleApplyChanges = useCallback(
    async (changes: AIAssistantResponse["changes"], messageIndex: number) => {
      if (!changes || isApplying) {
        return;
      }

      setIsApplying(true);
      setApplyingMessageIndex(messageIndex);

      try {
        await onApplyChanges(changes);
        addToast("Changes applied successfully", "success");
      } catch (error) {
        console.error("Failed to apply changes:", error);
        addToast(
          error instanceof Error ? error.message : "Failed to apply changes",
          "error",
        );
      } finally {
        setIsApplying(false);
        setApplyingMessageIndex(null);
      }
    },
    [isApplying, onApplyChanges, addToast],
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      handleSendMessage(prompt);
    },
    [handleSendMessage],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage(inputValue);
      }
    },
    [inputValue, handleSendMessage],
  );

  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStartY.current = clientY;
    dragStartHeight.current = panelRef.current?.offsetHeight || 0;
  }, []);

  const handleDragMove = useCallback((e: MouseEvent | TouchEvent) => {
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const deltaY = dragStartY.current - clientY;
    const newHeight = dragStartHeight.current + deltaY;

    // Snap to states based on height
    if (newHeight < window.innerHeight * 0.3) {
      setPanelState("minimized");
    } else if (newHeight < window.innerHeight * 0.65) {
      setPanelState("partial");
    } else {
      setPanelState("expanded");
    }
  }, []);

  const handleDragEnd = useCallback(() => {
    document.removeEventListener("mousemove", handleDragMove);
    document.removeEventListener("mouseup", handleDragEnd);
    document.removeEventListener("touchmove", handleDragMove);
    document.removeEventListener("touchend", handleDragEnd);
  }, [handleDragMove]);

  useEffect(() => {
    return () => {
      handleDragEnd();
    };
  }, [handleDragEnd]);

  if (!isOpen) {
    return null;
  }

  if (panelState === "minimized") {
    return null;
  }

  const heightClass = panelState === "partial" ? "h-[50vh]" : "h-[80vh]";

  return (
    <div
      ref={panelRef}
      className={`fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border-t border-neutral-200 bg-white shadow-2xl transition-all duration-300 dark:border-neutral-700 dark:bg-neutral-900 sm:inset-x-auto sm:right-6 sm:w-[400px] sm:rounded-3xl sm:border ${heightClass}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
        <div className="flex flex-col">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Recipe Assistant
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {recipe.name} - {version.title || "Current Version"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setPanelState((prev) => (prev === "expanded" ? "partial" : "expanded"))
            }
            className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label={panelState === "expanded" ? "Minimize" : "Maximize"}
          >
            {panelState === "expanded" ? "−" : "□"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-600 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Drag Handle (Mobile) */}
      <div
        className="flex cursor-ns-resize justify-center py-2 sm:hidden"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseMove={(e) => {
          if (e.buttons === 1) {
            handleDragMove(e.nativeEvent);
          }
        }}
        onTouchMove={(e) => handleDragMove(e.nativeEvent)}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
      >
        <div className="h-1 w-12 rounded-full bg-neutral-300 dark:bg-neutral-600"></div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="text-4xl">✨</div>
            <div>
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                How can I help?
              </h4>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                Ask me about ingredients, techniques, or improvements
              </p>
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickPrompt(QUICK_PROMPTS.tooSweet)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Too sweet?
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt(QUICK_PROMPTS.improveTexture)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Improve texture
              </button>
              <button
                type="button"
                onClick={() => handleQuickPrompt(QUICK_PROMPTS.suggestVariations)}
                className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                Suggest variations
              </button>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatMessage
            key={idx}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            changes={msg.changes}
            onApplyChanges={
              msg.changes && msg.role === "assistant"
                ? () => handleApplyChanges(msg.changes!, idx)
                : undefined
            }
            isApplying={isApplying && applyingMessageIndex === idx}
          />
        ))}

        {isGenerating && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-neutral-200 px-5 py-4 dark:border-neutral-700">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about ingredients, techniques..."
            disabled={isGenerating}
            rows={1}
            className="flex-1 resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-neutral-400 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50 dark:focus:border-neutral-500 dark:focus:ring-neutral-700"
            style={{
              maxHeight: "100px",
              height: "auto",
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = `${Math.min(target.scrollHeight, 100)}px`;
            }}
          />
          <button
            type="button"
            onClick={() => handleSendMessage(inputValue)}
            disabled={!inputValue.trim() || isGenerating}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:from-purple-700 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:from-purple-500 dark:to-blue-500 dark:hover:from-purple-600 dark:hover:to-blue-600"
          >
            {isGenerating ? "..." : "Send"}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
