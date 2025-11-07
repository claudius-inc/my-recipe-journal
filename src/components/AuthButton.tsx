"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button, Box, Text, Spinner } from "@radix-ui/themes";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isMenuOpen]);

  if (isPending) {
    return (
      <Box style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Spinner size="2" />
        <Text size="2" style={{ color: "#666" }} className="hidden sm:inline">
          Loading...
        </Text>
      </Box>
    );
  }

  if (!session) {
    return (
      <Button onClick={() => router.push("/login")} size="2" color="blue">
        Sign In
      </Button>
    );
  }

  return (
    <Box style={{ position: "relative" }} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-700 text-sm font-medium text-white transition hover:bg-neutral-600 dark:bg-neutral-300 dark:text-neutral-900 dark:hover:bg-neutral-200"
        aria-label="User menu"
      >
        {session.user?.email?.charAt(0).toUpperCase() || "U"}
      </button>

      {isMenuOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          style={{ zIndex: 100 }}
        >
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Signed in as</p>
            <p className="mt-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {session.user?.email}
            </p>
          </div>
          <div className="p-2">
            <button
              type="button"
              onClick={async () => {
                setIsMenuOpen(false);
                await signOut();
                router.push("/login");
              }}
              className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </Box>
  );
}
