"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button, Box, Text, Spinner } from "@radix-ui/themes";
import { LockOpen1Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
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
      <Button onClick={() => router.push("/login")} size="2">
        Sign In <LockOpen1Icon className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Box style={{ position: "relative" }} ref={menuRef}>
      <Button
        variant="solid"
        size="2"
        className="!h-8 !w-8 !rounded-full !p-0"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="User menu"
      >
        {session.user?.email?.charAt(0).toUpperCase() || "U"}
      </Button>

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
            <Button
              variant="ghost"
              size="2"
              className="w-full !justify-start"
              onClick={async () => {
                setIsSigningOut(true);
                try {
                  await signOut();
                  setIsMenuOpen(false);
                  router.push("/login");
                } finally {
                  setIsSigningOut(false);
                }
              }}
              disabled={isSigningOut}
            >
              {isSigningOut ? (
                <span className="flex items-center gap-2">
                  <Spinner size="1" />
                  Signing out...
                </span>
              ) : (
                "Sign Out"
              )}
            </Button>
          </div>
        </div>
      )}
    </Box>
  );
}
