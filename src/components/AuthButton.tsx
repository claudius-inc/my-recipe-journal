"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button, Box, Text, Spinner, DropdownMenu } from "@radix-ui/themes";
import { LockOpen1Icon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";

export function AuthButton() {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  // Add a safety timeout to prevent infinite loading state
  const [isLongLoading, setIsLongLoading] = useState(false);

  // If isPending is true, we generally show loading.
  // However, if it hangs (e.g. network issue), we should eventually default to "Sign In"
  // to allow the user to try again.
  const showLoading = isPending && !error && !isLongLoading;

  // Force loading to stop after 1.5 seconds if it's still pending
  // This prevents the spinner from getting stuck if the auth check hangs
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPending) {
      timer = setTimeout(() => setIsLongLoading(true), 1500);
    } else {
      setIsLongLoading(false);
    }
    return () => clearTimeout(timer);
  }, [isPending]);

  if (showLoading) {
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
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-9)] text-sm font-medium text-white transition hover:bg-[var(--accent-10)]"
          aria-label="User menu"
        >
          {session.user?.email?.charAt(0).toUpperCase() || "U"}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content align="end" className="min-w-[16rem]">
        <div className="px-3 py-2">
          <p className="text-xs text-neutral-500">Signed in as</p>
          <p className="mt-1 truncate text-sm font-medium text-neutral-900">
            {session.user?.email}
          </p>
        </div>

        <DropdownMenu.Separator />

        <DropdownMenu.Item
          onSelect={async (e) => {
            e.preventDefault();
            setIsSigningOut(true);
            try {
              await signOut();
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
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
