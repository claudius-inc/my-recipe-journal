import { useEffect, useState } from "react";

interface KeyboardState {
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

export function useKeyboardHeight(): KeyboardState {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    // Only run on client side and if visualViewport is supported
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const handleResize = () => {
      const viewport = window.visualViewport!;
      const keyboardHeightPx = window.innerHeight - viewport.height;

      setKeyboardHeight(keyboardHeightPx);
      // Consider keyboard visible if height change is more than 100px
      // This threshold helps filter out minor viewport changes
      setIsKeyboardVisible(keyboardHeightPx > 100);
    };

    // Add event listener for viewport resize (keyboard show/hide)
    window.visualViewport.addEventListener("resize", handleResize);

    // Check initial state
    handleResize();

    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return { keyboardHeight, isKeyboardVisible };
}
