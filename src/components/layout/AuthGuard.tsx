"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Box, Spinner } from "@radix-ui/themes";

const publicRoutes = ["/login", "/auth"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    if (isPending && !isAuthorized) {
      const timer = setTimeout(() => setShowSpinner(true), 300);
      return () => clearTimeout(timer);
    }
    setShowSpinner(false);
  }, [isPending, isAuthorized]);

  useEffect(() => {
    // If we're on a public route, we don't need to check auth
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      setIsAuthorized(true);
      return;
    }

    if (!isPending) {
      if (!session || error) {
        // If not pending and no session, redirect to login
        router.push("/login");
      } else {
        // If session exists, authorize
        setIsAuthorized(true);
      }
    }
  }, [session, isPending, error, pathname, router]);

  // If on a public route, render children immediately
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return <>{children}</>;
  }

  // If loading or checking auth, show a full screen loader?
  // Or just return null/skeleton?
  // For better UX during initial load often protected by middleware, we might show children
  // but if middleware missed it (invalid cookie), we want to hide sensitive content.
  // However, isPending is true initially.

  // Strategy:
  // Show loading spinner only if we are pending and not authorized yet.
  if (isPending && !isAuthorized) {
    if (!showSpinner) {
      return null;
    }
    return (
      <Box
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spinner size="3" />
      </Box>
    );
  }

  // If check failed (redirecting), don't show content
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
